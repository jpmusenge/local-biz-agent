#!/usr/bin/env ts-node
/**
 * Deployment Script
 * Deploy generated websites to Vercel
 *
 * Usage: npm run deploy -- --limit=10
 */

import 'dotenv/config';
import { deployment } from '../src/modules/deployment/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  logger.info('Starting website deployment...');

  // Initialize database
  db.init();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '10', 10) : 10;

  logger.info(`Deploying up to ${limit} websites`);

  try {
    // TODO: Fetch generated websites pending deployment from database
    const websitesToDeploy: Array<{
      businessId: string;
      projectName: string;
      files: Array<{ path: string; content: string }>;
    }> = [];

    let deployed = 0;

    for (const website of websitesToDeploy) {
      const result = await deployment.deploy({
        projectName: website.projectName,
        files: website.files,
      });

      if (result.success) {
        deployed++;
        logger.info(`Deployed: ${website.projectName} -> ${result.url}`);
        // TODO: Update deployment status in database
      } else {
        logger.error(`Failed to deploy ${website.projectName}: ${result.error}`);
      }
    }

    logger.info(`Deployed ${deployed} websites`);
    logger.info('Deployment complete!');
  } catch (error) {
    logger.error('Deployment failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
