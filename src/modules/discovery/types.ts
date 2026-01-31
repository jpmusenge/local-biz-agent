// Discovery Module Types
// Types and interfaces for Google Places-based business discovery

/**
 * Business categories we target for website generation.
 * These map to Google Places API "type" values.
 *
 * Google Places API uses specific type strings - we map our categories to these.
 * See: https://developers.google.com/maps/documentation/places/web-service/supported_types
 */
export enum BusinessCategory {
  RESTAURANT = 'restaurant',
  BARBER_SHOP = 'barber_shop',        // Maps to "hair_care" in Places API
  AUTO_REPAIR = 'car_repair',
  SALON = 'beauty_salon',
  GYM = 'gym',
  RETAIL = 'store',
  PLUMBER = 'plumber',
  ELECTRICIAN = 'electrician',
  LANDSCAPING = 'landscaper',         // Not a direct Places type, use keyword search
  CLEANING_SERVICE = 'cleaning',      // Not a direct Places type, use keyword search
  OTHER = 'establishment',
}

/**
 * Maps our BusinessCategory enum to Google Places API search parameters.
 * Some categories use 'type' parameter, others use 'keyword' for better results.
 */
export const CATEGORY_TO_PLACES_PARAMS: Record<BusinessCategory, { type?: string; keyword?: string }> = {
  [BusinessCategory.RESTAURANT]: { type: 'restaurant' },
  [BusinessCategory.BARBER_SHOP]: { type: 'hair_care', keyword: 'barber' },
  [BusinessCategory.AUTO_REPAIR]: { type: 'car_repair' },
  [BusinessCategory.SALON]: { type: 'beauty_salon' },
  [BusinessCategory.GYM]: { type: 'gym' },
  [BusinessCategory.RETAIL]: { type: 'store' },
  [BusinessCategory.PLUMBER]: { keyword: 'plumber' },
  [BusinessCategory.ELECTRICIAN]: { keyword: 'electrician' },
  [BusinessCategory.LANDSCAPING]: { keyword: 'landscaping' },
  [BusinessCategory.CLEANING_SERVICE]: { keyword: 'cleaning service' },
  [BusinessCategory.OTHER]: { type: 'establishment' },
};

/**
 * Human-readable labels for categories (for logging and UI)
 */
export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  [BusinessCategory.RESTAURANT]: 'Restaurants',
  [BusinessCategory.BARBER_SHOP]: 'Barber Shops',
  [BusinessCategory.AUTO_REPAIR]: 'Auto Repair',
  [BusinessCategory.SALON]: 'Salons',
  [BusinessCategory.GYM]: 'Gyms',
  [BusinessCategory.RETAIL]: 'Retail Stores',
  [BusinessCategory.PLUMBER]: 'Plumbers',
  [BusinessCategory.ELECTRICIAN]: 'Electricians',
  [BusinessCategory.LANDSCAPING]: 'Landscaping',
  [BusinessCategory.CLEANING_SERVICE]: 'Cleaning Services',
  [BusinessCategory.OTHER]: 'Other Businesses',
};

/**
 * Geographic area to search for businesses
 */
export interface SearchArea {
  city: string;
  state: string;
  radiusMiles: number;
}

/**
 * Result from Google Places API search or details request.
 * Contains the fields we care about for business discovery.
 *
 * Google Places API returns many more fields, but we extract only what we need.
 * See: https://developers.google.com/maps/documentation/places/web-service/details
 */
export interface PlacesBusinessResult {
  // Unique identifier from Google Places - use this for deduplication
  place_id: string;

  // Business name
  name: string;

  // Full formatted address
  formatted_address: string;

  // Address components (parsed from Google's response)
  address_components?: {
    city?: string;
    state?: string;
    county?: string;
    postal_code?: string;
    street_address?: string;
  };

  // Contact info - KEY FIELD: null/undefined means no website!
  website?: string | null;
  formatted_phone_number?: string;

  // Business details
  types?: string[];           // Google's category types
  business_status?: string;   // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY

  // Location
  geometry?: {
    lat: number;
    lng: number;
  };

  // Ratings (useful for prioritization)
  rating?: number;
  user_ratings_total?: number;

  // Operating hours
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };

  // Photos (first photo URL if available)
  photo_url?: string;
}

/**
 * Configuration for the discovery service
 */
export interface DiscoveryConfig {
  // Geographic areas to search
  areas: SearchArea[];

  // Business categories to find
  categories: BusinessCategory[];

  // Maximum results per search (Google Places allows up to 60 with pagination)
  maxResultsPerSearch: number;

  // Optional: minimum rating filter (1-5)
  minRating?: number;

  // Optional: only include currently operating businesses
  onlyOperational?: boolean;
}

/**
 * Summary of a discovery run
 */
export interface DiscoverySummary {
  // Total places found from Google Places API
  totalFound: number;

  // Places that don't have a website
  withoutWebsite: number;

  // New businesses saved to our database
  newlySaved: number;

  // Businesses that already existed in our database
  alreadyExists: number;

  // Breakdown by category
  byCategory: Record<string, {
    found: number;
    withoutWebsite: number;
    saved: number;
  }>;

  // Breakdown by area
  byArea: Record<string, {
    found: number;
    withoutWebsite: number;
    saved: number;
  }>;
}

/**
 * Google Places API response types (internal use)
 */
export interface GooglePlacesSearchResponse {
  results: GooglePlacesResult[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

export interface GooglePlacesDetailsResponse {
  result: GooglePlacesResult;
  status: string;
  error_message?: string;
}

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  // These fields come from Place Details API, not Nearby Search
  website?: string;
  formatted_phone_number?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
