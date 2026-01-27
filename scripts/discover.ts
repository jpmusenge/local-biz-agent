#!/usr/bin/env ts-node
/**
 * Discovery Script
 * Run business discovery from state registries
 *
 * Usage: npm run discover -- --states=CA,TX --days=7
 */

import 'dotenv/config';
import { discovery } from '../src/modules/discovery/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  logger.info('Starting business discovery...');

  // Initialize database
  db.init();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const statesArg = args.find((arg) => arg.startsWith('--states='));
  const daysArg = args.find((arg) => arg.startsWith('--days='));

  const states = statesArg ? statesArg.split('=')[1]?.split(',') ?? [] : ['CA'];
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1] ?? '7', 10) : 7;

  logger.info(`Discovering businesses from states: ${states.join(', ')}`);
  logger.info(`Looking back ${daysBack} days`);

  try {
    const businesses = await discovery.discoverBusinesses({
      states,
      daysBack,
    });

    logger.info(`Found ${businesses.length} new businesses`);

    // TODO: Save to database

    logger.info('Discovery complete!');
  } catch (error) {
    logger.error('Discovery failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
