// Discovery Module
// Discovers businesses without websites using Google Places API

import { db } from '../../database/index.js';
import { logger } from '../../utils/index.js';
import { GooglePlacesClient, googlePlaces } from './google-places.js';
import {
  BusinessCategory,
  SearchArea,
  DiscoveryConfig,
  DiscoverySummary,
  PlacesBusinessResult,
  CATEGORY_LABELS,
} from './types.js';

// Re-export types and client
export * from './types.js';
export { GooglePlacesClient, googlePlaces } from './google-places.js';

/**
 * DiscoveryService - Main service for discovering businesses without websites
 *
 * This service:
 * 1. Uses Google Places API to find businesses in target areas
 * 2. Gets detailed info to check if they have websites
 * 3. Filters to ONLY businesses WITHOUT websites (our targets)
 * 4. Checks database to avoid duplicates
 * 5. Saves new discoveries to database
 *
 * Usage:
 * ```typescript
 * const discovery = new DiscoveryService({
 *   areas: [{ city: 'Holly Springs', state: 'MS', radiusMiles: 10 }],
 *   categories: [BusinessCategory.BARBER_SHOP, BusinessCategory.RESTAURANT],
 *   maxResultsPerSearch: 20,
 * });
 *
 * const summary = await discovery.run();
 * console.log(`Found ${summary.withoutWebsite} businesses without websites`);
 * ```
 */
export class DiscoveryService {
  private config: DiscoveryConfig;
  private placesClient: GooglePlacesClient;

  constructor(config: DiscoveryConfig, placesClient?: GooglePlacesClient) {
    this.config = {
      ...config,
      maxResultsPerSearch: config.maxResultsPerSearch ?? 20,
      onlyOperational: config.onlyOperational ?? true,
    };
    this.placesClient = placesClient ?? googlePlaces;
  }

  /**
   * Run the discovery process for all configured areas and categories.
   * Returns a summary of what was found and saved.
   */
  async run(): Promise<DiscoverySummary> {
    logger.info('Starting business discovery...');
    logger.info(`Areas: ${this.config.areas.map(a => `${a.city}, ${a.state}`).join(', ')}`);
    logger.info(`Categories: ${this.config.categories.map(c => CATEGORY_LABELS[c]).join(', ')}`);

    if (this.placesClient.isInMockMode()) {
      logger.warn('Running in MOCK MODE - results are simulated');
    }

    // Ensure database is initialized
    db.initialize();

    const summary: DiscoverySummary = {
      totalFound: 0,
      withoutWebsite: 0,
      newlySaved: 0,
      alreadyExists: 0,
      byCategory: {},
      byArea: {},
    };

    // Process each area and category combination
    for (const area of this.config.areas) {
      const areaKey = `${area.city}, ${area.state}`;
      summary.byArea[areaKey] = { found: 0, withoutWebsite: 0, saved: 0 };

      for (const category of this.config.categories) {
        const categoryKey = CATEGORY_LABELS[category];
        if (!summary.byCategory[categoryKey]) {
          summary.byCategory[categoryKey] = { found: 0, withoutWebsite: 0, saved: 0 };
        }

        logger.info(`\nSearching: ${categoryKey} in ${areaKey}`);

        try {
          const results = await this.discoverForAreaAndCategory(area, category);

          // Update summary stats
          summary.totalFound += results.found;
          summary.withoutWebsite += results.withoutWebsite;
          summary.newlySaved += results.saved;
          summary.alreadyExists += results.alreadyExists;

          summary.byArea[areaKey]!.found += results.found;
          summary.byArea[areaKey]!.withoutWebsite += results.withoutWebsite;
          summary.byArea[areaKey]!.saved += results.saved;

          summary.byCategory[categoryKey]!.found += results.found;
          summary.byCategory[categoryKey]!.withoutWebsite += results.withoutWebsite;
          summary.byCategory[categoryKey]!.saved += results.saved;

        } catch (error) {
          logger.error(`Error discovering ${categoryKey} in ${areaKey}:`, error);
        }
      }
    }

    logger.info('\n' + '='.repeat(50));
    logger.info('DISCOVERY COMPLETE');
    logger.info('='.repeat(50));
    logger.info(`Total places found: ${summary.totalFound}`);
    logger.info(`Without websites: ${summary.withoutWebsite}`);
    logger.info(`Newly saved: ${summary.newlySaved}`);
    logger.info(`Already in database: ${summary.alreadyExists}`);

    return summary;
  }

  /**
   * Discover businesses for a specific area and category.
   */
  private async discoverForAreaAndCategory(
    area: SearchArea,
    category: BusinessCategory
  ): Promise<{ found: number; withoutWebsite: number; saved: number; alreadyExists: number }> {
    const stats = { found: 0, withoutWebsite: 0, saved: 0, alreadyExists: 0 };

    // Step 1: Search for businesses in the area
    const searchResults = await this.placesClient.searchBusinesses(
      area,
      category,
      this.config.maxResultsPerSearch
    );

    stats.found = searchResults.length;

    if (searchResults.length === 0) {
      logger.info('  No results found');
      return stats;
    }

    // Step 2: Get details for each place to check website status
    // Note: Nearby Search doesn't return website field, we need Place Details
    logger.info(`  Getting details for ${searchResults.length} places...`);

    const placeIds = searchResults.map(r => r.place_id);
    const detailedResults = await this.placesClient.getPlaceDetailsBatch(
      placeIds,
      (current, total) => {
        if (current % 10 === 0 || current === total) {
          logger.debug(`  Progress: ${current}/${total}`);
        }
      }
    );

    // Step 3: Filter to businesses WITHOUT websites
    const withoutWebsites = detailedResults.filter(place => {
      // Check if website is null, undefined, or empty string
      const hasWebsite = place.website && place.website.trim().length > 0;

      // Also filter by operational status if configured
      if (this.config.onlyOperational && place.business_status !== 'OPERATIONAL') {
        return false;
      }

      // Filter by minimum rating if configured
      if (this.config.minRating && place.rating && place.rating < this.config.minRating) {
        return false;
      }

      return !hasWebsite;
    });

    stats.withoutWebsite = withoutWebsites.length;
    logger.info(`  Found ${withoutWebsites.length} without websites (out of ${detailedResults.length})`);

    // Step 4: Check database and save new businesses
    for (const place of withoutWebsites) {
      const saved = await this.saveIfNew(place, category, area);
      if (saved) {
        stats.saved++;
      } else {
        stats.alreadyExists++;
      }
    }

    if (stats.saved > 0) {
      logger.info(`  Saved ${stats.saved} new businesses to database`);
    }
    if (stats.alreadyExists > 0) {
      logger.info(`  Skipped ${stats.alreadyExists} (already in database)`);
    }

    return stats;
  }

  /**
   * Save a business to the database if it doesn't already exist.
   * Checks by google_place_id first, then by name+city+state combination.
   *
   * @returns true if saved, false if already exists
   */
  private async saveIfNew(
    place: PlacesBusinessResult,
    category: BusinessCategory,
    area: SearchArea
  ): Promise<boolean> {
    // Check if already exists by place_id
    if (db.businessExistsBySource('google_places', place.place_id)) {
      return false;
    }

    // Also check by name + city + state to catch duplicates from different sources
    // Use raw query since queryBusinesses doesn't support name filter
    const rawDb = db.raw();
    const existingByName = rawDb.prepare(`
      SELECT 1 FROM businesses
      WHERE LOWER(name) = LOWER(?)
        AND LOWER(city) = LOWER(?)
        AND LOWER(state) = LOWER(?)
      LIMIT 1
    `).get(
      place.name,
      place.address_components?.city ?? area.city,
      place.address_components?.state ?? area.state
    );

    if (existingByName) {
      return false;
    }

    // Insert new business
    db.insertBusiness({
      name: place.name,
      business_type: CATEGORY_LABELS[category],
      address: place.address_components?.street_address ?? place.formatted_address,
      city: place.address_components?.city ?? area.city,
      state: place.address_components?.state ?? area.state,
      county: place.address_components?.county ?? null,
      phone: place.formatted_phone_number ?? null,
      website_url: null, // We specifically target businesses WITHOUT websites
      has_website: 0,
      source: 'google_places',
      source_id: place.place_id,
      category: category,
      google_place_id: place.place_id,
      status: 'discovered',
    });

    return true;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): DiscoveryConfig {
    return { ...this.config };
  }
}

// Export a convenience function for quick discovery runs
export async function discoverBusinesses(config: DiscoveryConfig): Promise<DiscoverySummary> {
  const service = new DiscoveryService(config);
  return service.run();
}

// Legacy export for backwards compatibility
export const discovery = {
  DiscoveryService,
  discoverBusinesses,
  googlePlaces,
};
