#!/usr/bin/env tsx
/**
 * Deployment Script
 * Deploy generated websites to Vercel
 *
 * Usage:
 *   npm run deploy              # Deploy 1 website (default for testing)
 *   npm run deploy -- --limit=5 # Deploy up to 5 websites
 *   npm run deploy -- --all     # Deploy all pending websites
 *   npm run deploy -- --id=xyz  # Deploy a specific website by ID
 */

import 'dotenv/config';
import { DeploymentService } from '../src/modules/deployment/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  logger.info('Website Deployment Script\n');

  // Initialize database
  db.initialize();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const idArg = args.find((arg) => arg.startsWith('--id='));
  const deployAll = args.includes('--all');

  const limit = deployAll ? 100 : (limitArg ? parseInt(limitArg.split('=')[1] ?? '1', 10) : 1);
  const specificId = idArg?.split('=')[1];

  try {
    const service = new DeploymentService();

    if (service.isInMockMode()) {
      logger.warn('Running in MOCK MODE - URLs will be simulated');
      logger.warn('Set VERCEL_TOKEN in .env for real deployments\n');
    }

    if (specificId) {
      // Deploy a specific website by ID
      logger.info(`Deploying website: ${specificId}`);

      const website = db.getWebsiteById(specificId);
      if (!website) {
        logger.error(`Website not found: ${specificId}`);
        logger.info('\nRun "npm run preview -- --list" to see available websites');
        process.exit(1);
      }

      const business = db.getBusinessById(website.business_id);
      if (!business) {
        logger.error(`Business not found for website: ${specificId}`);
        process.exit(1);
      }

      logger.info(`Business: ${business.name}`);
      logger.info(`Template: ${website.template_name}`);
      logger.info(`Variation: ${website.variation_number}\n`);

      const result = await service.deployWebsiteById(specificId);

      if (result.success) {
        logger.info('\nDeployment successful!');
        logger.info(`Live URL: ${result.url}`);
        logger.info(`Deployment ID: ${result.deploymentId}`);
      } else {
        logger.error(`\nDeployment failed: ${result.error}`);
        process.exit(1);
      }
    } else {
      // Deploy pending websites
      logger.info(`Deploying up to ${limit} website(s)...\n`);

      // Show what's pending before deploying
      const pending = db.getWebsitesPendingDeployment(limit);
      if (pending.length === 0) {
        logger.info('No websites pending deployment.');
        logger.info('\nTo generate websites first, run: npm run generate');
        return;
      }

      logger.info(`Found ${pending.length} website(s) pending deployment:`);
      for (const website of pending) {
        const business = db.getBusinessById(website.business_id);
        logger.info(`  - ${business?.name ?? 'Unknown'} (${website.template_name})`);
      }
      logger.info('');

      // Deploy them
      const summary = await service.deployPending(limit);

      // Final summary
      if (summary.successful > 0) {
        logger.info('\nSuccessfully deployed websites:');
        for (const r of summary.results) {
          if (r.result.success) {
            logger.info(`  ${r.businessName}: ${r.result.url}`);
          }
        }
      }

      if (summary.failed > 0) {
        logger.info('\nFailed deployments:');
        for (const r of summary.results) {
          if (!r.result.success) {
            logger.info(`  ${r.businessName}: ${r.result.error}`);
          }
        }
      }

      // Show database stats
      const stats = db.getStats();
      logger.info('\nDatabase status:');
      logger.info(`  Websites generated: ${stats.totalWebsites}`);
      logger.info(`  Businesses deployed: ${stats.byStatus.deployed}`);
    }

    logger.info('\nDeployment script complete!');
  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
