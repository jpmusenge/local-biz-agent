#!/usr/bin/env tsx
/**
 * Discovery Script
 * Discover businesses without websites using Google Places API
 *
 * Usage:
 *   npm run discover                    # Run with default areas and categories
 *   npm run discover -- --mock          # Force mock mode (for testing)
 *   npm run discover -- --limit=50      # Limit results per search
 *
 * Default target areas: Holly Springs MS and surrounding cities
 * Default categories: Barber shops, restaurants, auto repair, salons
 */

import 'dotenv/config';
import { DiscoveryService, BusinessCategory, CATEGORY_LABELS } from '../src/modules/discovery/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('LOCAL BIZ AGENT - BUSINESS DISCOVERY');
  console.log('='.repeat(60));
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const maxResultsPerSearch = limitArg ? parseInt(limitArg.split('=')[1] ?? '20', 10) : 20;

  // Define target areas - Holly Springs, MS and surrounding cities
  const areas = [
    { city: 'Holly Springs', state: 'MS', radiusMiles: 10 },
    { city: 'Oxford', state: 'MS', radiusMiles: 10 },
    { city: 'Tupelo', state: 'MS', radiusMiles: 15 },
    { city: 'Southaven', state: 'MS', radiusMiles: 10 },
  ];

  // Define target business categories
  // Focus on service businesses that benefit most from a web presence
  const categories = [
    BusinessCategory.BARBER_SHOP,
    BusinessCategory.RESTAURANT,
    BusinessCategory.AUTO_REPAIR,
    BusinessCategory.SALON,
  ];

  logger.info('Target Areas:');
  for (const area of areas) {
    logger.info(`  - ${area.city}, ${area.state} (${area.radiusMiles} mile radius)`);
  }

  logger.info('');
  logger.info('Target Categories:');
  for (const cat of categories) {
    logger.info(`  - ${CATEGORY_LABELS[cat]}`);
  }

  logger.info('');
  logger.info(`Max results per search: ${maxResultsPerSearch}`);
  logger.info('');

  // Initialize database
  db.initialize();

  try {
    // Create and run discovery service
    const discovery = new DiscoveryService({
      areas,
      categories,
      maxResultsPerSearch,
      onlyOperational: true,
    });

    const summary = await discovery.run();

    // Print detailed summary
    console.log('');
    console.log('='.repeat(60));
    console.log('DISCOVERY SUMMARY');
    console.log('='.repeat(60));
    console.log('');

    console.log('Overall Results:');
    console.log(`  Total places found:      ${summary.totalFound}`);
    console.log(`  Without websites:        ${summary.withoutWebsite}`);
    console.log(`  Newly saved to database: ${summary.newlySaved}`);
    console.log(`  Already in database:     ${summary.alreadyExists}`);
    console.log('');

    console.log('By Category:');
    for (const [category, stats] of Object.entries(summary.byCategory)) {
      console.log(`  ${category}:`);
      console.log(`    Found: ${stats.found}, Without Website: ${stats.withoutWebsite}, Saved: ${stats.saved}`);
    }
    console.log('');

    console.log('By Area:');
    for (const [area, stats] of Object.entries(summary.byArea)) {
      console.log(`  ${area}:`);
      console.log(`    Found: ${stats.found}, Without Website: ${stats.withoutWebsite}, Saved: ${stats.saved}`);
    }
    console.log('');

    // Show database stats
    const dbStats = db.getStats();
    console.log('Database Stats:');
    console.log(`  Total businesses: ${dbStats.totalBusinesses}`);
    console.log(`  By status:`, dbStats.byStatus);
    console.log('');

    if (summary.newlySaved > 0) {
      console.log(`SUCCESS: Discovered ${summary.newlySaved} new businesses without websites!`);
      console.log('Run "npm run generate" to create websites for them.');
    } else if (summary.alreadyExists > 0) {
      console.log('No new businesses found - all discoveries already in database.');
    } else if (summary.withoutWebsite === 0) {
      console.log('All businesses found already have websites.');
    } else {
      console.log('No businesses found matching criteria.');
    }

  } catch (error) {
    logger.error('Discovery failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
