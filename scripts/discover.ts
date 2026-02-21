#!/usr/bin/env tsx
/**
 * Discovery Script
 * Discover businesses without websites using Google Places API
 *
 * Usage:
 *   npm run discover                                           # All areas and categories (default)
 *   npm run discover -- --list-categories                     # List all available categories and exit
 *   npm run discover -- --category=restaurant                 # Restaurants only
 *   npm run discover -- --category=barber                     # Barber shops only
 *   npm run discover -- --category=restaurant,salon           # Multiple categories (comma-separated)
 *   npm run discover -- --city="Holly Springs, MS"            # One city only
 *   npm run discover -- --category=restaurant --city="Oxford, MS"
 *   npm run discover -- --limit=50                            # Limit results per search
 */

import 'dotenv/config';
import { DiscoveryService, BusinessCategory, CATEGORY_LABELS } from '../src/modules/discovery/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

// ==================== CATEGORY RESOLUTION ====================

/**
 * Maps user-friendly CLI strings to BusinessCategory enum values.
 * Supports common aliases and variations.
 */
const CATEGORY_ALIASES: Record<string, BusinessCategory> = {
  // Restaurant
  restaurant:       BusinessCategory.RESTAURANT,
  restaurants:      BusinessCategory.RESTAURANT,
  food:             BusinessCategory.RESTAURANT,
  // Barber
  barber:           BusinessCategory.BARBER_SHOP,
  barbers:          BusinessCategory.BARBER_SHOP,
  barber_shop:      BusinessCategory.BARBER_SHOP,
  barbershop:       BusinessCategory.BARBER_SHOP,
  // Auto repair
  auto:             BusinessCategory.AUTO_REPAIR,
  auto_repair:      BusinessCategory.AUTO_REPAIR,
  car_repair:       BusinessCategory.AUTO_REPAIR,
  mechanic:         BusinessCategory.AUTO_REPAIR,
  // Salon
  salon:            BusinessCategory.SALON,
  salons:           BusinessCategory.SALON,
  beauty:           BusinessCategory.SALON,
  beauty_salon:     BusinessCategory.SALON,
  // Gym
  gym:              BusinessCategory.GYM,
  gyms:             BusinessCategory.GYM,
  fitness:          BusinessCategory.GYM,
  // Retail
  retail:           BusinessCategory.RETAIL,
  store:            BusinessCategory.RETAIL,
  shop:             BusinessCategory.RETAIL,
  // Plumber
  plumber:          BusinessCategory.PLUMBER,
  plumbers:         BusinessCategory.PLUMBER,
  plumbing:         BusinessCategory.PLUMBER,
  // Electrician
  electrician:      BusinessCategory.ELECTRICIAN,
  electricians:     BusinessCategory.ELECTRICIAN,
  electric:         BusinessCategory.ELECTRICIAN,
  // Landscaping
  landscaping:      BusinessCategory.LANDSCAPING,
  landscaper:       BusinessCategory.LANDSCAPING,
  lawn:             BusinessCategory.LANDSCAPING,
  // Cleaning
  cleaning:         BusinessCategory.CLEANING_SERVICE,
  cleaning_service: BusinessCategory.CLEANING_SERVICE,
  cleaner:          BusinessCategory.CLEANING_SERVICE,
};

/**
 * Resolve a CLI category string to a BusinessCategory enum value.
 * Returns null if the string doesn't match any known category.
 */
function resolveCategory(input: string): BusinessCategory | null {
  const normalized = input.trim().toLowerCase().replace(/[\s-]/g, '_');
  return CATEGORY_ALIASES[normalized] ?? null;
}

// ==================== DEFAULT CONFIG ====================

/** All target areas used when no --city flag is provided */
const DEFAULT_AREAS = [
  { city: 'Holly Springs', state: 'MS', radiusMiles: 10 },
  { city: 'Oxford',        state: 'MS', radiusMiles: 10 },
  { city: 'Tupelo',        state: 'MS', radiusMiles: 15 },
  { city: 'Southaven',     state: 'MS', radiusMiles: 10 },
];

/** All categories used when no --category flag is provided */
const DEFAULT_CATEGORIES = [
  BusinessCategory.BARBER_SHOP,
  BusinessCategory.RESTAURANT,
  BusinessCategory.AUTO_REPAIR,
  BusinessCategory.SALON,
];

// ==================== MAIN ====================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // ── --list-categories ──────────────────────────────────────────
  if (args.includes('--list-categories')) {
    console.log('');
    console.log('Available categories for --category flag:');
    console.log('');
    console.log(`  ${'Flag value'.padEnd(20)} Label`);
    console.log('  ' + '-'.repeat(40));
    const shown = new Set<BusinessCategory>();
    for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
      if (!shown.has(cat)) {
        shown.add(cat);
        console.log(`  ${alias.padEnd(20)} ${CATEGORY_LABELS[cat]}`);
      }
    }
    console.log('');
    console.log('Examples:');
    console.log('  npm run discover -- --category=restaurant');
    console.log('  npm run discover -- --category=barber --city="Holly Springs, MS"');
    console.log('  npm run discover -- --category=restaurant,salon');
    console.log('');
    return;
  }

  console.log('='.repeat(60));
  console.log('LOCAL BIZ AGENT - BUSINESS DISCOVERY');
  console.log('='.repeat(60));
  console.log('');

  // ── --limit ────────────────────────────────────────────────────
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const maxResultsPerSearch = limitArg ? parseInt(limitArg.split('=')[1] ?? '20', 10) : 20;

  // ── --category ─────────────────────────────────────────────────
  const categoryArg = args.find((arg) => arg.startsWith('--category='));
  let categories: BusinessCategory[];

  if (categoryArg) {
    const raw = categoryArg.split('=')[1] ?? '';
    const inputs = raw.split(',').map(s => s.trim()).filter(Boolean);
    const resolved: BusinessCategory[] = [];

    for (const input of inputs) {
      const cat = resolveCategory(input);
      if (cat) {
        if (!resolved.includes(cat)) resolved.push(cat);
      } else {
        logger.error(`Unknown category: "${input}". Run --list-categories to see options.`);
        process.exit(1);
      }
    }
    categories = resolved;
  } else {
    categories = DEFAULT_CATEGORIES;
  }

  // ── --city ─────────────────────────────────────────────────────
  const cityArg = args.find((arg) => arg.startsWith('--city='));
  let areas: typeof DEFAULT_AREAS;

  if (cityArg) {
    const raw = (cityArg.split('=')[1] ?? '').replace(/^["']|["']$/g, '').trim();
    // Parse "City, ST" format
    const parts = raw.split(',').map(s => s.trim());
    const city = parts[0] ?? raw;
    const state = parts[1] ?? 'MS';

    // Try to reuse radius from defaults if it's a known city
    const known = DEFAULT_AREAS.find(
      a => a.city.toLowerCase() === city.toLowerCase() && a.state.toLowerCase() === state.toLowerCase()
    );
    areas = [{ city, state, radiusMiles: known?.radiusMiles ?? 10 }];
  } else {
    areas = DEFAULT_AREAS;
  }

  // ── Print config ───────────────────────────────────────────────
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
    const discovery = new DiscoveryService({
      areas,
      categories,
      maxResultsPerSearch,
      onlyOperational: true,
    });

    const summary = await discovery.run();

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
