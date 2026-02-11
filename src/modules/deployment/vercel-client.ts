// Vercel API Client for Website Deployment
// Wraps the Vercel API to deploy static websites

import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { sleep, retry } from '../../utils/index.js';
import type {
  DeploymentConfig,
  DeploymentResult,
  ProjectInfo,
  DeploymentStatus,
  DeploymentFile,
} from './types.js';

/**
 * VercelClient - Wrapper for the Vercel API
 *
 * This client handles website deployment to Vercel. It:
 * 1. Creates new Vercel projects for businesses
 * 2. Deploys HTML content as static sites
 * 3. Tracks deployment status
 *
 * MOCK MODE:
 * When VERCEL_TOKEN is not set, the client operates in mock mode.
 * This simulates deployments and returns fake URLs for testing.
 */
export class VercelClient {
  private client: AxiosInstance | null = null;
  private token: string | null;
  private teamId: string | null;
  private domain: string;
  private isMockMode: boolean;

  private static readonly API_BASE = 'https://api.vercel.com';
  private static readonly MOCK_DOMAIN = 'mock-deploy.local';

  constructor(configOverride?: Partial<DeploymentConfig>) {
    this.token = configOverride?.vercelToken ?? config.get('VERCEL_TOKEN') ?? null;
    this.teamId = configOverride?.teamId ?? config.get('VERCEL_TEAM_ID') ?? null;
    this.domain = configOverride?.domain ?? config.get('DEPLOYMENT_DOMAIN') ?? 'vercel.app';
    this.isMockMode = !this.token;

    if (this.isMockMode) {
      logger.warn('VERCEL_TOKEN not set - running in MOCK MODE');
      logger.warn('Mock mode simulates deployments. Set VERCEL_TOKEN for real deployments.');
    } else {
      this.client = axios.create({
        baseURL: VercelClient.API_BASE,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout for deployments
      });
    }
  }

  /**
   * Check if running in mock mode
   */
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Sanitize a business name for use as a subdomain.
   * Converts to lowercase, replaces non-alphanumeric with hyphens.
   */
  sanitizeSubdomain(businessName: string): string {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50); // Vercel has subdomain length limits
  }

  /**
   * Generate a full subdomain for a business website.
   * Format: {sanitized-business-name}-v{variation}.{domain}
   */
  generateSubdomain(businessName: string, variationNumber: number): string {
    const sanitized = this.sanitizeSubdomain(businessName);
    return `${sanitized}-v${variationNumber}`;
  }

  /**
   * Create a new Vercel project for a business.
   */
  async createProject(businessName: string, variationNumber: number = 1): Promise<ProjectInfo> {
    const subdomain = this.generateSubdomain(businessName, variationNumber);
    const projectName = subdomain;

    logger.info(`Creating Vercel project: ${projectName}`);

    if (this.isMockMode) {
      return this.mockCreateProject(projectName, subdomain);
    }

    try {
      const params = this.teamId ? { teamId: this.teamId } : {};

      const response = await this.client!.post('/v9/projects', {
        name: projectName,
        framework: null, // Static site
        publicSource: false,
      }, { params });

      const project = response.data as { id: string; name: string };

      logger.info(`Created Vercel project: ${project.name} (${project.id})`);

      return {
        projectId: project.id,
        name: project.name,
        subdomain,
      };
    } catch (error) {
      if (this.isAxiosError(error)) {
        // Project might already exist
        if (error.response?.status === 409) {
          logger.info(`Project ${projectName} already exists, fetching...`);
          return this.getProject(projectName);
        }
        this.handleApiError(error, 'create project');
      }
      throw error;
    }
  }

  /**
   * Get an existing Vercel project by name.
   */
  async getProject(projectName: string): Promise<ProjectInfo> {
    if (this.isMockMode) {
      return this.mockCreateProject(projectName, projectName);
    }

    try {
      const params = this.teamId ? { teamId: this.teamId } : {};

      const response = await this.client!.get(`/v9/projects/${encodeURIComponent(projectName)}`, { params });
      const project = response.data as { id: string; name: string };

      return {
        projectId: project.id,
        name: project.name,
        subdomain: projectName,
      };
    } catch (error) {
      if (this.isAxiosError(error)) {
        this.handleApiError(error, 'get project');
      }
      throw error;
    }
  }

  /**
   * Deploy a website to Vercel.
   *
   * @param projectId - Vercel project ID (can also be project name)
   * @param htmlContent - The HTML content to deploy
   * @param businessName - Business name (for logging)
   * @returns Deployment result with URL
   */
  async deployWebsite(
    projectId: string,
    htmlContent: string,
    businessName: string
  ): Promise<DeploymentResult> {
    logger.info(`Deploying website for "${businessName}" to project ${projectId}...`);

    if (this.isMockMode) {
      return this.mockDeployWebsite(projectId, businessName);
    }

    try {
      const files: DeploymentFile[] = [
        { path: 'index.html', content: htmlContent },
      ];

      // Create deployment using Vercel API v13
      const params = this.teamId ? { teamId: this.teamId } : {};

      const response = await retry(
        async () => {
          return this.client!.post('/v13/deployments', {
            name: projectId,
            files: files.map(f => ({
              file: f.path,
              data: Buffer.from(f.content).toString('base64'),
              encoding: 'base64',
            })),
            projectSettings: {
              framework: null,
            },
            target: 'production',
          }, { params });
        },
        { maxAttempts: 3, delayMs: 2000, backoffMultiplier: 2 }
      );

      const deployment = response.data as {
        id: string;
        url: string;
        readyState: DeploymentStatus;
      };

      // Wait for deployment to be ready
      const finalStatus = await this.waitForDeployment(deployment.id);

      if (finalStatus === 'READY') {
        const url = `https://${deployment.url}`;
        logger.info(`Deployment successful: ${url}`);

        return {
          success: true,
          url,
          deploymentId: deployment.id,
        };
      } else {
        return {
          success: false,
          url: '',
          deploymentId: deployment.id,
          error: `Deployment ended with status: ${finalStatus}`,
        };
      }
    } catch (error) {
      if (this.isAxiosError(error)) {
        const errorMessage = this.handleApiError(error, 'deploy website');
        return {
          success: false,
          url: '',
          deploymentId: '',
          error: errorMessage,
        };
      }
      return {
        success: false,
        url: '',
        deploymentId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the status of a deployment.
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    if (this.isMockMode) {
      return 'READY';
    }

    try {
      const params = this.teamId ? { teamId: this.teamId } : {};

      const response = await this.client!.get(`/v13/deployments/${deploymentId}`, { params });
      const deployment = response.data as { readyState: DeploymentStatus };

      return deployment.readyState;
    } catch (error) {
      if (this.isAxiosError(error)) {
        this.handleApiError(error, 'get deployment status');
      }
      throw error;
    }
  }

  /**
   * Wait for a deployment to reach a terminal state.
   */
  private async waitForDeployment(
    deploymentId: string,
    maxWaitMs: number = 120000,
    pollIntervalMs: number = 3000
  ): Promise<DeploymentStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getDeploymentStatus(deploymentId);

      if (status === 'READY' || status === 'ERROR' || status === 'CANCELED') {
        return status;
      }

      logger.debug(`Deployment ${deploymentId} status: ${status}, waiting...`);
      await sleep(pollIntervalMs);
    }

    logger.warn(`Deployment ${deploymentId} timed out after ${maxWaitMs}ms`);
    return 'ERROR';
  }

  /**
   * Delete a Vercel project.
   */
  async deleteProject(projectId: string): Promise<boolean> {
    if (this.isMockMode) {
      logger.info(`[MOCK] Deleted project: ${projectId}`);
      return true;
    }

    try {
      const params = this.teamId ? { teamId: this.teamId } : {};

      await this.client!.delete(`/v9/projects/${projectId}`, { params });
      logger.info(`Deleted Vercel project: ${projectId}`);
      return true;
    } catch (error) {
      if (this.isAxiosError(error)) {
        this.handleApiError(error, 'delete project');
      }
      return false;
    }
  }

  // ==================== MOCK METHODS ====================

  private mockCreateProject(projectName: string, subdomain: string): Promise<ProjectInfo> {
    logger.info(`[MOCK] Created project: ${projectName}`);
    return Promise.resolve({
      projectId: `mock-project-${Date.now()}`,
      name: projectName,
      subdomain,
    });
  }

  private mockDeployWebsite(projectId: string, businessName: string): Promise<DeploymentResult> {
    const subdomain = this.sanitizeSubdomain(businessName);
    const mockUrl = `https://${subdomain}.${VercelClient.MOCK_DOMAIN}`;

    logger.info(`[MOCK] Deployed website: ${mockUrl}`);

    return Promise.resolve({
      success: true,
      url: mockUrl,
      deploymentId: `mock-deploy-${Date.now()}`,
    });
  }

  // ==================== ERROR HANDLING ====================

  private isAxiosError(error: unknown): error is AxiosError {
    return axios.isAxiosError(error);
  }

  private handleApiError(error: AxiosError, operation: string): string {
    const status = error.response?.status;
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    const message = data?.error?.message ?? error.message;

    if (status === 401) {
      logger.error(`Vercel API authentication failed - check VERCEL_TOKEN`);
    } else if (status === 403) {
      logger.error(`Vercel API access denied - check permissions and team ID`);
    } else if (status === 429) {
      logger.error(`Vercel API rate limited - please wait before retrying`);
    } else if (status === 404) {
      logger.error(`Vercel resource not found`);
    } else {
      logger.error(`Vercel API error during ${operation}: ${status} - ${message}`);
    }

    return `${operation} failed: ${status} - ${message}`;
  }
}

// Export singleton instance
export const vercelClient = new VercelClient();
