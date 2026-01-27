#!/usr/bin/env ts-node
/**
 * Full Pipeline Script
 * Run the complete discovery -> enrichment -> generation -> deployment pipeline
 *
 * Usage: npm run pipeline -- --states=CA --days=7 --limit=10
 */

import 'dotenv/config';
import { discovery } from '../src/modules/discovery/index.js';
import { enrichment } from '../src/modules/enrichment/index.js';
import { generator } from '../src/modules/generator/index.js';
import { deployment } from '../src/modules/deployment/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

interface PipelineStats {
  discovered: number;
  enriched: number;
  withoutWebsite: number;
  generated: number;
  deployed: number;
  errors: number;
}

async function main(): Promise<void> {
  logger.info('Starting full pipeline...');
  logger.info('='.repeat(50));

  // Initialize database
  db.init();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const statesArg = args.find((arg) => arg.startsWith('--states='));
  const daysArg = args.find((arg) => arg.startsWith('--days='));
  const limitArg = args.find((arg) => arg.startsWith('--limit='));

  const states = statesArg ? statesArg.split('=')[1]?.split(',') ?? [] : ['CA'];
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1] ?? '7', 10) : 7;
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '10', 10) : 10;

  const stats: PipelineStats = {
    discovered: 0,
    enriched: 0,
    withoutWebsite: 0,
    generated: 0,
    deployed: 0,
    errors: 0,
  };

  try {
    // Step 1: Discovery
    logger.info('\n[1/4] DISCOVERY');
    logger.info('-'.repeat(30));

    const businesses = await discovery.discoverBusinesses({ states, daysBack });
    stats.discovered = businesses.length;
    logger.info(`Discovered ${stats.discovered} new businesses`);

    // Step 2: Enrichment
    logger.info('\n[2/4] ENRICHMENT');
    logger.info('-'.repeat(30));

    const businessData = businesses.map((b) => ({ name: b.name, address: b.address }));
    const enriched = await enrichment.enrichBatch(businessData);
    stats.enriched = enriched.length;

    const needsWebsite = enriched.filter((e) => !e.hasWebsite);
    stats.withoutWebsite = needsWebsite.length;
    logger.info(`Enriched ${stats.enriched} businesses`);
    logger.info(`${stats.withoutWebsite} need websites`);

    // Step 3: Generation
    logger.info('\n[3/4] GENERATION');
    logger.info('-'.repeat(30));

    const toGenerate = needsWebsite.slice(0, limit);

    for (const business of toGenerate) {
      const originalBusiness = businesses.find((b) => b.id === business.businessId);
      if (!originalBusiness) continue;

      const website = await generator.generateWebsite(
        originalBusiness.name,
        { address: business.formattedAddress, phone: business.phoneNumber },
        { style: 'modern', includeContactForm: true, includeSocialLinks: false }
      );

      if (website) {
        stats.generated++;
        logger.info(`Generated: ${originalBusiness.name}`);
      }
    }

    logger.info(`Generated ${stats.generated} websites`);

    // Step 4: Deployment
    logger.info('\n[4/4] DEPLOYMENT');
    logger.info('-'.repeat(30));

    // TODO: Deploy generated websites
    logger.info(`Deployed ${stats.deployed} websites`);

    // Summary
    logger.info('\n' + '='.repeat(50));
    logger.info('PIPELINE COMPLETE');
    logger.info('='.repeat(50));
    logger.info(`Discovered: ${stats.discovered}`);
    logger.info(`Enriched:   ${stats.enriched}`);
    logger.info(`Need sites: ${stats.withoutWebsite}`);
    logger.info(`Generated:  ${stats.generated}`);
    logger.info(`Deployed:   ${stats.deployed}`);
    logger.info(`Errors:     ${stats.errors}`);
  } catch (error) {
    logger.error('Pipeline failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
