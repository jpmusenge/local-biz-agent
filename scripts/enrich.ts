#!/usr/bin/env ts-node
/**
 * Enrichment Script
 * Enrich discovered businesses with Google Places data
 *
 * Usage: npm run enrich -- --limit=100
 */

import 'dotenv/config';
import { enrichment } from '../src/modules/enrichment/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  logger.info('Starting business enrichment...');

  // Initialize database
  db.init();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '100', 10) : 100;

  logger.info(`Processing up to ${limit} businesses`);

  try {
    // TODO: Fetch unenriched businesses from database
    const businesses: Array<{ name: string; address?: string }> = [];

    const enriched = await enrichment.enrichBatch(businesses);

    const withoutWebsite = enriched.filter((b) => !b.hasWebsite);
    logger.info(`Enriched ${enriched.length} businesses`);
    logger.info(`${withoutWebsite.length} businesses without websites`);

    // TODO: Save enrichment data to database

    logger.info('Enrichment complete!');
  } catch (error) {
    logger.error('Enrichment failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
