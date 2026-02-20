// Google Places API Client
// Handles all interactions with the Google Places API for business discovery

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config/index.js';
import { logger, sleep, RateLimiter } from '../../utils/index.js';
import {
  SearchArea,
  BusinessCategory,
  PlacesBusinessResult,
  GooglePlacesSearchResponse,
  GooglePlacesDetailsResponse,
  GooglePlacesResult,
  CATEGORY_TO_PLACES_PARAMS,
  CATEGORY_LABELS,
} from './types.js';

/**
 * GooglePlacesClient - Wrapper for Google Places API
 *
 * This client handles:
 * 1. Nearby Search - Find businesses in an area by category
 * 2. Place Details - Get full details including website for a specific place
 *
 * IMPORTANT: The Nearby Search API does NOT return the website field!
 * You must call Place Details for each result to check if they have a website.
 *
 * API Documentation:
 * - Nearby Search: https://developers.google.com/maps/documentation/places/web-service/search-nearby
 * - Place Details: https://developers.google.com/maps/documentation/places/web-service/details
 *
 * Rate Limits:
 * - Default: 1000 requests per day (can be increased with billing)
 * - We implement client-side rate limiting to be safe
 *
 * MOCK MODE:
 * When GOOGLE_PLACES_API_KEY is not set, the client operates in mock mode.
 * This returns realistic fake data for testing the pipeline without API costs.
 */
export class GooglePlacesClient {
  private client: AxiosInstance;
  private apiKey: string | null;
  private rateLimiter: RateLimiter;
  private isMockMode: boolean;

  // Google Places API endpoints
  private static readonly NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  private static readonly PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
  private static readonly GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

  // Miles to meters conversion
  private static readonly MILES_TO_METERS = 1609.34;

  constructor() {
    this.apiKey = config.get('GOOGLE_PLACES_API_KEY') ?? null;
    this.isMockMode = !this.apiKey;

    if (this.isMockMode) {
      logger.warn('GOOGLE_PLACES_API_KEY not set - running in MOCK MODE');
      logger.warn('Mock mode returns fake data for testing. Set API key for real results.');
    }

    // Rate limit to 5 requests per second (conservative)
    this.rateLimiter = new RateLimiter(5);

    this.client = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Check if running in mock mode
   */
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Search for businesses in a geographic area by category.
   *
   * IMPORTANT: This uses Nearby Search which does NOT return website info.
   * You must call getPlaceDetails() for each result to get website data.
   *
   * @param area - Geographic area to search (city, state, radius)
   * @param category - Business category to search for
   * @param maxResults - Maximum results to return (default 20, max 60 with pagination)
   * @returns Array of business results (without website field populated)
   */
  async searchBusinesses(
    area: SearchArea,
    category: BusinessCategory,
    maxResults = 20
  ): Promise<PlacesBusinessResult[]> {
    if (this.isMockMode) {
      return this.mockSearchBusinesses(area, category, maxResults);
    }

    const results: PlacesBusinessResult[] = [];
    const categoryParams = CATEGORY_TO_PLACES_PARAMS[category];
    const categoryLabel = CATEGORY_LABELS[category];

    try {
      // First, geocode the city to get lat/lng
      const location = await this.geocodeCity(area.city, area.state);
      if (!location) {
        logger.error(`Could not geocode location: ${area.city}, ${area.state}`);
        return [];
      }

      logger.info(`Searching for ${categoryLabel} in ${area.city}, ${area.state} (${area.radiusMiles} mile radius)`);

      // Build search parameters
      const params: Record<string, string> = {
        location: `${location.lat},${location.lng}`,
        radius: String(Math.round(area.radiusMiles * GooglePlacesClient.MILES_TO_METERS)),
        key: this.apiKey!,
      };

      // Add type and/or keyword based on category
      if (categoryParams.type) {
        params['type'] = categoryParams.type;
      }
      if (categoryParams.keyword) {
        params['keyword'] = categoryParams.keyword;
      }

      // Make initial request
      await this.rateLimiter.acquire();
      const response = await this.client.get<GooglePlacesSearchResponse>(
        GooglePlacesClient.NEARBY_SEARCH_URL,
        { params }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.error(`Places API error: ${response.data.status} - ${response.data.error_message}`);
        return [];
      }

      // Process results
      for (const place of response.data.results) {
        if (results.length >= maxResults) break;
        results.push(this.transformPlaceResult(place, area));
      }

      // Handle pagination if we need more results
      let pageToken = response.data.next_page_token;
      while (pageToken && results.length < maxResults) {
        // Google requires a short delay before using page token
        await sleep(2000);
        await this.rateLimiter.acquire();

        const nextResponse = await this.client.get<GooglePlacesSearchResponse>(
          GooglePlacesClient.NEARBY_SEARCH_URL,
          { params: { pagetoken: pageToken, key: this.apiKey } }
        );

        if (nextResponse.data.status !== 'OK') break;

        for (const place of nextResponse.data.results) {
          if (results.length >= maxResults) break;
          results.push(this.transformPlaceResult(place, area));
        }

        pageToken = nextResponse.data.next_page_token;
      }

      logger.info(`Found ${results.length} ${categoryLabel} in ${area.city}`);
      return results;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Google Places API request failed: ${error.message}`);
        if (error.response?.status === 403) {
          logger.error('API key may be invalid or have insufficient permissions');
        }
      } else {
        logger.error('Unexpected error during business search:', error);
      }
      return [];
    }
  }

  /**
   * Get detailed information for a specific place, including website.
   *
   * This is the ONLY way to get website information from Google Places API.
   * The Nearby Search endpoint does not include the website field.
   *
   * @param placeId - Google Place ID
   * @returns Full business details including website (if available)
   */
  async getPlaceDetails(placeId: string): Promise<PlacesBusinessResult | null> {
    if (this.isMockMode) {
      return this.mockGetPlaceDetails(placeId);
    }

    try {
      await this.rateLimiter.acquire();

      // Request specific fields to minimize API cost
      // Website, phone, and address are the key fields we need
      const fields = [
        'place_id',
        'name',
        'formatted_address',
        'address_components',
        'geometry',
        'website',
        'formatted_phone_number',
        'types',
        'business_status',
        'rating',
        'user_ratings_total',
        'opening_hours',
      ].join(',');

      const response = await this.client.get<GooglePlacesDetailsResponse>(
        GooglePlacesClient.PLACE_DETAILS_URL,
        {
          params: {
            place_id: placeId,
            fields,
            key: this.apiKey,
          },
        }
      );

      if (response.data.status !== 'OK') {
        logger.error(`Place Details API error: ${response.data.status} - ${response.data.error_message}`);
        return null;
      }

      return this.transformPlaceResult(response.data.result);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Place Details request failed for ${placeId}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Batch get details for multiple places.
   * Includes progress logging and respects rate limits.
   *
   * @param placeIds - Array of Google Place IDs
   * @param onProgress - Optional callback for progress updates
   * @returns Array of place details
   */
  async getPlaceDetailsBatch(
    placeIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<PlacesBusinessResult[]> {
    const results: PlacesBusinessResult[] = [];
    const total = placeIds.length;

    for (let i = 0; i < total; i++) {
      const placeId = placeIds[i];
      if (!placeId) continue;

      const details = await this.getPlaceDetails(placeId);
      if (details) {
        results.push(details);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Small delay between requests to be nice to the API
      if (i < total - 1) {
        await sleep(100);
      }
    }

    return results;
  }

  /**
   * Geocode a city/state to get lat/lng coordinates.
   */
  private async geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
    if (this.isMockMode) {
      // Return mock coordinates for known test cities
      const mockCoords: Record<string, { lat: number; lng: number }> = {
        'holly springs, ms': { lat: 34.7673, lng: -89.4487 },
        'oxford, ms': { lat: 34.3665, lng: -89.5192 },
        'tupelo, ms': { lat: 34.2576, lng: -88.7034 },
        'southaven, ms': { lat: 34.9889, lng: -90.0126 },
        'memphis, tn': { lat: 35.1495, lng: -90.0490 },
      };
      return mockCoords[`${city.toLowerCase()}, ${state.toLowerCase()}`] ?? { lat: 34.0, lng: -89.0 };
    }

    try {
      await this.rateLimiter.acquire();

      const response = await this.client.get<{
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
        status: string;
      }>(GooglePlacesClient.GEOCODE_URL, {
        params: {
          address: `${city}, ${state}`,
          key: this.apiKey,
        },
      });

      if (response.data.status === 'OK' && response.data.results[0]) {
        return response.data.results[0].geometry.location;
      }

      logger.error(`Geocoding API returned status: ${response.data.status} for "${city}, ${state}"`);
      return null;
    } catch (error) {
      logger.error(`Geocoding failed for ${city}, ${state}:`, error);
      return null;
    }
  }

  /**
   * Transform Google Places API result to our PlacesBusinessResult format.
   */
  private transformPlaceResult(place: GooglePlacesResult, area?: SearchArea): PlacesBusinessResult {
    // Parse address components if available
    let addressComponents: PlacesBusinessResult['address_components'];
    if (place.address_components) {
      addressComponents = {
        city: this.findAddressComponent(place.address_components, 'locality'),
        state: this.findAddressComponent(place.address_components, 'administrative_area_level_1'),
        county: this.findAddressComponent(place.address_components, 'administrative_area_level_2'),
        postal_code: this.findAddressComponent(place.address_components, 'postal_code'),
        street_address: this.findAddressComponent(place.address_components, 'street_number') +
          ' ' + this.findAddressComponent(place.address_components, 'route'),
      };
    } else if (area) {
      // Use search area info if no address components
      addressComponents = {
        city: area.city,
        state: area.state,
      };
    }

    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address ?? place.vicinity ?? '',
      address_components: addressComponents,
      website: place.website ?? null,
      formatted_phone_number: place.formatted_phone_number,
      types: place.types,
      business_status: place.business_status,
      geometry: place.geometry?.location ? {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      } : undefined,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      opening_hours: place.opening_hours ? {
        open_now: place.opening_hours.open_now,
        weekday_text: place.opening_hours.weekday_text,
      } : undefined,
    };
  }

  /**
   * Find a specific component in Google's address_components array.
   */
  private findAddressComponent(
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
    type: string
  ): string {
    const component = components.find(c => c.types.includes(type));
    return component?.long_name ?? '';
  }

  // ==================== MOCK MODE METHODS ====================

  /**
   * Generate mock search results for testing.
   * Returns realistic fake businesses in the specified area.
   */
  private mockSearchBusinesses(
    area: SearchArea,
    category: BusinessCategory,
    maxResults: number
  ): Promise<PlacesBusinessResult[]> {
    const categoryLabel = CATEGORY_LABELS[category];
    logger.info(`[MOCK] Searching for ${categoryLabel} in ${area.city}, ${area.state}`);

    // Generate mock businesses based on category
    const mockBusinesses = this.generateMockBusinesses(area, category, maxResults);

    logger.info(`[MOCK] Found ${mockBusinesses.length} ${categoryLabel} in ${area.city}`);
    return Promise.resolve(mockBusinesses);
  }

  /**
   * Generate mock place details.
   * Simulates ~60% of businesses having websites (realistic ratio).
   */
  private mockGetPlaceDetails(placeId: string): Promise<PlacesBusinessResult | null> {
    // Parse mock place ID to get business info
    // Format: mock_<area>_<category>_<index>
    const parts = placeId.split('_');
    const index = parseInt(parts[parts.length - 1] ?? '0', 10);

    // Simulate ~40% of businesses NOT having a website (our target!)
    // Use deterministic logic based on index for consistent testing
    const hasWebsite = index % 5 < 3; // 60% have websites, 40% don't

    const mockResult: PlacesBusinessResult = {
      place_id: placeId,
      name: `Mock Business ${index}`,
      formatted_address: `${100 + index} Main Street`,
      website: hasWebsite ? `https://mockbusiness${index}.com` : null,
      formatted_phone_number: `(555) ${String(100 + index).padStart(3, '0')}-${String(1000 + index).slice(-4)}`,
      business_status: 'OPERATIONAL',
      rating: 3.5 + (index % 3) * 0.5,
      user_ratings_total: 10 + index * 5,
    };

    return Promise.resolve(mockResult);
  }

  /**
   * Generate an array of mock businesses for a given area and category.
   */
  private generateMockBusinesses(
    area: SearchArea,
    category: BusinessCategory,
    count: number
  ): PlacesBusinessResult[] {
    const businesses: PlacesBusinessResult[] = [];
    const categoryLabel = CATEGORY_LABELS[category];
    const businessNames = this.getMockBusinessNames(category);

    for (let i = 0; i < Math.min(count, businessNames.length); i++) {
      const name = businessNames[i] ?? `${categoryLabel} Business ${i + 1}`;
      businesses.push({
        place_id: `mock_${area.city.toLowerCase().replace(/\s/g, '')}_${category}_${i}`,
        name,
        formatted_address: `${100 + i * 10} ${this.getRandomStreet()} Street, ${area.city}, ${area.state}`,
        address_components: {
          city: area.city,
          state: area.state,
          street_address: `${100 + i * 10} ${this.getRandomStreet()} Street`,
        },
        types: [category],
        business_status: 'OPERATIONAL',
        rating: 3.0 + Math.random() * 2,
        user_ratings_total: Math.floor(10 + Math.random() * 100),
        geometry: {
          lat: 34.7673 + (Math.random() - 0.5) * 0.1,
          lng: -89.4487 + (Math.random() - 0.5) * 0.1,
        },
      });
    }

    return businesses;
  }

  /**
   * Get mock business names for a category.
   */
  private getMockBusinessNames(category: BusinessCategory): string[] {
    const names: Record<BusinessCategory, string[]> = {
      [BusinessCategory.RESTAURANT]: [
        "Joe's Diner", "The Local Grill", "Mama's Kitchen", "Downtown Cafe",
        "The Hungry Bear", "Sunset Bistro", "Corner Pub & Grill", "Fresh Eats",
        "Southern Comfort Kitchen", "Main Street Pizza",
      ],
      [BusinessCategory.BARBER_SHOP]: [
        "Classic Cuts", "The Gentleman's Barber", "Fresh Fades", "Main Street Barber",
        "Sharp Looks Barbershop", "The Cutting Edge", "Old School Barber",
        "Precision Cuts", "The Barber Lounge", "Hometown Barbershop",
      ],
      [BusinessCategory.AUTO_REPAIR]: [
        "Mike's Auto Shop", "Reliable Auto Repair", "Quick Fix Garage",
        "A1 Auto Service", "Family Auto Care", "Pro Mechanics",
        "Honest Auto Repair", "Fast Lane Auto", "Quality Car Care",
        "Main Street Motors",
      ],
      [BusinessCategory.SALON]: [
        "Style Studio", "Beautiful You Salon", "The Hair Loft", "Shear Excellence",
        "Glamour Hair Salon", "Chic Cuts", "The Beauty Bar", "Hair Haven",
        "Elegant Touch Salon", "New Look Hair Studio",
      ],
      [BusinessCategory.GYM]: [
        "Iron Works Gym", "Fitness First", "Peak Performance Gym", "The Training Zone",
        "Muscle Factory", "Fit Life Gym", "Power House Fitness", "Champion Gym",
        "Active Life Fitness", "Strong Body Gym",
      ],
      [BusinessCategory.RETAIL]: [
        "Main Street Boutique", "The Corner Store", "Family Mart", "Local Goods",
        "Value Shop", "Town Square Retail", "The General Store", "Discount Depot",
        "Community Market", "Everyday Essentials",
      ],
      [BusinessCategory.PLUMBER]: [
        "Reliable Plumbing", "Quick Drain Solutions", "Pro Plumbers", "AquaFix Plumbing",
        "24/7 Plumbing Service", "Master Plumbers Co", "Clear Drain Pros",
        "Family Plumbing", "Hometown Plumbers", "Expert Pipe Services",
      ],
      [BusinessCategory.ELECTRICIAN]: [
        "Bright Spark Electric", "Pro Electric Services", "Power Up Electrical",
        "Safe Wiring Co", "Lightning Electric", "Hometown Electricians",
        "Quality Electric", "Reliable Power Solutions", "Expert Electrical",
        "Circuit Masters",
      ],
      [BusinessCategory.LANDSCAPING]: [
        "Green Thumb Landscaping", "Perfect Lawns", "Nature's Touch", "Pro Lawn Care",
        "Beautiful Yards", "Outdoor Solutions", "Garden Masters",
        "Elite Landscaping", "Fresh Cut Lawns", "Scenic Landscaping",
      ],
      [BusinessCategory.CLEANING_SERVICE]: [
        "Sparkle Clean", "Pristine Cleaning", "Fresh Start Cleaners", "Maid Perfect",
        "Crystal Clear Cleaning", "Pro Clean Services", "Spotless Home",
        "Shine Bright Cleaners", "Deep Clean Pros", "Tidy Home Services",
      ],
      [BusinessCategory.OTHER]: [
        "Local Business 1", "Community Services", "Town Enterprise",
        "Main Street Business", "Family Owned Shop",
      ],
    };

    return names[category] ?? names[BusinessCategory.OTHER];
  }

  /**
   * Get a random street name for mock addresses.
   */
  private getRandomStreet(): string {
    const streets = ['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Market', 'Church', 'Spring', 'Highway'];
    return streets[Math.floor(Math.random() * streets.length)] ?? 'Main';
  }
}

// Export singleton instance
export const googlePlaces = new GooglePlacesClient();
