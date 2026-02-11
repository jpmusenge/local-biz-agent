// Deployment Module Types
// Types and interfaces for Vercel deployment

/**
 * Configuration for the deployment service
 */
export interface DeploymentConfig {
  /** Vercel API token */
  vercelToken: string;

  /** Vercel team ID (optional, for team deployments) */
  teamId?: string;

  /** Base domain for subdomains (e.g., "mybizwebsites.com") */
  domain: string;
}

/**
 * Result of a deployment operation
 */
export interface DeploymentResult {
  /** Whether the deployment succeeded */
  success: boolean;

  /** The live URL of the deployed website */
  url: string;

  /** Vercel deployment ID */
  deploymentId: string;

  /** Error message if deployment failed */
  error?: string;
}

/**
 * Information about a Vercel project
 */
export interface ProjectInfo {
  /** Vercel project ID */
  projectId: string;

  /** Project name in Vercel */
  name: string;

  /** Subdomain assigned to this project */
  subdomain: string;
}

/**
 * Status of a deployment
 */
export type DeploymentStatus =
  | 'QUEUED'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED';

/**
 * File to deploy
 */
export interface DeploymentFile {
  /** File path (e.g., "index.html") */
  path: string;

  /** File content */
  content: string;
}

/**
 * Options for deploying a website
 */
export interface DeployOptions {
  /** Website ID from database */
  websiteId: string;

  /** Business name for subdomain generation */
  businessName: string;

  /** Variation number (1, 2, 3...) */
  variationNumber: number;

  /** HTML content to deploy */
  htmlContent: string;
}

/**
 * Batch deployment result
 */
export interface BatchDeploymentResult {
  /** Total websites attempted */
  total: number;

  /** Number of successful deployments */
  successful: number;

  /** Number of failed deployments */
  failed: number;

  /** Individual deployment results */
  results: Array<{
    websiteId: string;
    businessName: string;
    result: DeploymentResult;
  }>;
}
