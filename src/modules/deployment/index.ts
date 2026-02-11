// Deployment Module
// Deploy generated websites to Vercel with custom subdomains

import { db } from '../../database/index.js';
import { logger } from '../../utils/index.js';
import { VercelClient, vercelClient } from './vercel-client.js';
import type {
  DeploymentResult,
  DeployOptions,
  BatchDeploymentResult,
} from './types.js';

// Re-export types and client
export * from './types.js';
export { VercelClient, vercelClient } from './vercel-client.js';

/**
 * DeploymentService - Main service for deploying websites
 *
 * This service:
 * 1. Fetches generated websites from the database
 * 2. Deploys them to Vercel with custom subdomains
 * 3. Updates the database with live preview URLs
 * 4. Updates business status to "deployed"
 *
 * Usage:
 * ```typescript
 * const service = new DeploymentService();
 *
 * // Deploy a single website
 * const result = await service.deployWebsite({
 *   websiteId: 'abc123',
 *   businessName: 'Marcus Barbershop',
 *   variationNumber: 1,
 *   htmlContent: '<html>...</html>',
 * });
 *
 * // Deploy all pending websites
 * const summary = await service.deployPending(10);
 * ```
 */
export class DeploymentService {
  private client: VercelClient;

  constructor(client?: VercelClient) {
    this.client = client ?? vercelClient;
  }

  /**
   * Deploy a single website to Vercel.
   *
   * @param options - Deploy options including websiteId, businessName, variationNumber, htmlContent
   * @returns Deployment result with URL
   */
  async deployWebsite(options: DeployOptions): Promise<DeploymentResult> {
    const { websiteId, businessName, variationNumber, htmlContent } = options;

    logger.info(`Deploying website ${websiteId} for "${businessName}" (v${variationNumber})...`);

    try {
      // Create or get the Vercel project
      const project = await this.client.createProject(businessName, variationNumber);

      // Deploy the website
      const result = await this.client.deployWebsite(
        project.name,
        htmlContent,
        businessName
      );

      if (result.success) {
        // Update database with preview URL and deployed status
        db.markWebsiteDeployed(websiteId, result.url);
        logger.info(`Website deployed: ${result.url}`);
      } else {
        logger.error(`Deployment failed for ${websiteId}: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error deploying website ${websiteId}: ${errorMessage}`);

      return {
        success: false,
        url: '',
        deploymentId: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Deploy a website by its database ID.
   * Fetches the website and business info from the database.
   */
  async deployWebsiteById(websiteId: string): Promise<DeploymentResult> {
    const website = db.getWebsiteById(websiteId);

    if (!website) {
      return {
        success: false,
        url: '',
        deploymentId: '',
        error: `Website not found: ${websiteId}`,
      };
    }

    const business = db.getBusinessById(website.business_id);

    if (!business) {
      return {
        success: false,
        url: '',
        deploymentId: '',
        error: `Business not found for website: ${websiteId}`,
      };
    }

    return this.deployWebsite({
      websiteId: website.id,
      businessName: business.name,
      variationNumber: website.variation_number,
      htmlContent: website.html_content,
    });
  }

  /**
   * Deploy all pending websites (websites with no preview_url).
   *
   * @param limit - Maximum number of websites to deploy
   * @returns Batch deployment result summary
   */
  async deployPending(limit: number = 10): Promise<BatchDeploymentResult> {
    logger.info(`Fetching up to ${limit} websites pending deployment...`);

    const pendingWebsites = db.getWebsitesPendingDeployment(limit);

    if (pendingWebsites.length === 0) {
      logger.info('No websites pending deployment');
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    logger.info(`Found ${pendingWebsites.length} website(s) to deploy`);

    const results: BatchDeploymentResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (const website of pendingWebsites) {
      const business = db.getBusinessById(website.business_id);

      if (!business) {
        logger.warn(`Skipping website ${website.id} - business not found`);
        failed++;
        results.push({
          websiteId: website.id,
          businessName: 'Unknown',
          result: {
            success: false,
            url: '',
            deploymentId: '',
            error: 'Business not found',
          },
        });
        continue;
      }

      const result = await this.deployWebsite({
        websiteId: website.id,
        businessName: business.name,
        variationNumber: website.variation_number,
        htmlContent: website.html_content,
      });

      results.push({
        websiteId: website.id,
        businessName: business.name,
        result,
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    const summary: BatchDeploymentResult = {
      total: pendingWebsites.length,
      successful,
      failed,
      results,
    };

    logger.info('\n' + '='.repeat(50));
    logger.info('DEPLOYMENT SUMMARY');
    logger.info('='.repeat(50));
    logger.info(`Total: ${summary.total}`);
    logger.info(`Successful: ${summary.successful}`);
    logger.info(`Failed: ${summary.failed}`);

    if (summary.successful > 0) {
      logger.info('\nDeployed URLs:');
      for (const r of summary.results) {
        if (r.result.success) {
          logger.info(`  ${r.businessName}: ${r.result.url}`);
        }
      }
    }

    return summary;
  }

  /**
   * Get deployment status for a specific deployment.
   */
  async getDeploymentStatus(deploymentId: string): Promise<string> {
    return this.client.getDeploymentStatus(deploymentId);
  }

  /**
   * Check if running in mock mode.
   */
  isInMockMode(): boolean {
    return this.client.isInMockMode();
  }
}

/**
 * Convenience function to deploy pending websites.
 */
export async function deployPendingWebsites(limit: number = 10): Promise<BatchDeploymentResult> {
  const service = new DeploymentService();
  return service.deployPending(limit);
}

/**
 * Convenience function to deploy a single website by ID.
 */
export async function deployWebsiteById(websiteId: string): Promise<DeploymentResult> {
  const service = new DeploymentService();
  return service.deployWebsiteById(websiteId);
}

// Legacy export for backwards compatibility with existing deploy.ts script
export const deployment = {
  deploy: async (options: {
    projectName: string;
    files: Array<{ path: string; content: string }>;
  }): Promise<DeploymentResult> => {
    // This is a simplified deploy for backward compatibility
    const client = vercelClient;
    const htmlFile = options.files.find(f => f.path === 'index.html' || f.path.endsWith('.html'));

    if (!htmlFile) {
      return {
        success: false,
        url: '',
        deploymentId: '',
        error: 'No HTML file provided',
      };
    }

    return client.deployWebsite(options.projectName, htmlFile.content, options.projectName);
  },
};
