// Database Types
// TypeScript interfaces for all database entities

// Business status lifecycle
export type BusinessStatus =
  | 'discovered'
  | 'enriched'
  | 'website_generated'
  | 'deployed'
  | 'contacted'
  | 'sold';

// Source registries
export type BusinessSource = 'ms_sos' | 'tn_sos' | 'al_sos' | 'la_sos' | 'ar_sos' | string;

// Outreach methods
export type OutreachMethod = 'email' | 'phone' | 'in_person';

// Business entity
export interface Business {
  id: string;
  name: string;
  business_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  has_website: number; // 0 or 1 (SQLite boolean)
  source: BusinessSource;
  source_id: string | null;
  discovered_at: string;
  enriched_at: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

// Business insert (without auto-generated fields)
export interface BusinessInsert {
  id?: string; // Optional - will generate UUID if not provided
  name: string;
  business_type?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  county?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  has_website?: number;
  source: BusinessSource;
  source_id?: string | null;
  discovered_at?: string;
  status?: BusinessStatus;
}

// Business update (all fields optional)
export interface BusinessUpdate {
  name?: string;
  business_type?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  county?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  has_website?: number;
  source?: BusinessSource;
  source_id?: string | null;
  enriched_at?: string | null;
  status?: BusinessStatus;
}

// Generated website entity
export interface GeneratedWebsite {
  id: string;
  business_id: string;
  template_name: string;
  variation_number: number;
  html_content: string;
  preview_url: string | null;
  deployed_at: string | null;
  created_at: string;
}

// Website insert
export interface WebsiteInsert {
  id?: string;
  business_id: string;
  template_name: string;
  variation_number?: number;
  html_content: string;
  preview_url?: string | null;
}

// Website update
export interface WebsiteUpdate {
  template_name?: string;
  variation_number?: number;
  html_content?: string;
  preview_url?: string | null;
  deployed_at?: string | null;
}

// Outreach log entity
export interface OutreachLog {
  id: string;
  business_id: string;
  method: OutreachMethod;
  sent_at: string;
  response: string | null;
  notes: string | null;
}

// Outreach insert
export interface OutreachInsert {
  id?: string;
  business_id: string;
  method: OutreachMethod;
  sent_at?: string;
  response?: string | null;
  notes?: string | null;
}

// Query options
export interface BusinessQueryOptions {
  status?: BusinessStatus;
  source?: BusinessSource;
  state?: string;
  hasWebsite?: boolean;
  limit?: number;
  offset?: number;
}

// Statistics
export interface DatabaseStats {
  totalBusinesses: number;
  byStatus: Record<BusinessStatus, number>;
  bySource: Record<string, number>;
  totalWebsites: number;
  totalOutreach: number;
}
