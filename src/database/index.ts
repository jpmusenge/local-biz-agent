// Database Module
// SQLite database using better-sqlite3 with full CRUD operations

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config/index.js';
import type {
  Business,
  BusinessInsert,
  BusinessUpdate,
  BusinessQueryOptions,
  BusinessStatus,
  GeneratedWebsite,
  WebsiteInsert,
  WebsiteUpdate,
  OutreachLog,
  OutreachInsert,
  DatabaseStats,
} from './types.js';

// Re-export types
export * from './types.js';

export interface DatabaseConfig {
  path?: string;
  verbose?: boolean;
}

class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = config.get('DATABASE_PATH') ?? './data/local-biz.db';
  }

  // Initialize database connection and create tables
  initialize(dbConfig?: DatabaseConfig): Database.Database {
    if (this.db) {
      return this.db;
    }

    this.dbPath = dbConfig?.path ?? this.dbPath;

    // Ensure directory exists
    const dir = dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath, {
      verbose: dbConfig?.verbose ? console.log : undefined,
    });

    // Enable WAL mode and foreign keys
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();

    return this.db;
  }

  // Get database instance (initializes if needed)
  getInstance(): Database.Database {
    if (!this.db) {
      return this.initialize();
    }
    return this.db;
  }

  // Create all tables
  private createTables(): void {
    const db = this.getInstance();

    db.exec(`
      -- Businesses table
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        business_type TEXT,
        category TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        county TEXT,
        phone TEXT,
        email TEXT,
        website_url TEXT,
        has_website INTEGER DEFAULT 0,
        source TEXT NOT NULL,
        source_id TEXT,
        google_place_id TEXT,
        discovered_at TEXT NOT NULL,
        enriched_at TEXT,
        status TEXT DEFAULT 'discovered',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Generated websites table
      CREATE TABLE IF NOT EXISTS generated_websites (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        template_name TEXT NOT NULL,
        variation_number INTEGER DEFAULT 1,
        html_content TEXT NOT NULL,
        preview_url TEXT,
        deployed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      );

      -- Outreach log table
      CREATE TABLE IF NOT EXISTS outreach_log (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        method TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        response TEXT,
        notes TEXT,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
      CREATE INDEX IF NOT EXISTS idx_businesses_source ON businesses(source);
      CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state);
      CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
      CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
      CREATE INDEX IF NOT EXISTS idx_businesses_has_website ON businesses(has_website);
      CREATE INDEX IF NOT EXISTS idx_businesses_discovered_at ON businesses(discovered_at);
      CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id ON businesses(google_place_id);
      CREATE INDEX IF NOT EXISTS idx_generated_websites_business_id ON generated_websites(business_id);
      CREATE INDEX IF NOT EXISTS idx_outreach_log_business_id ON outreach_log(business_id);

      -- Unique constraint to prevent duplicate source records
      CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_source_unique
        ON businesses(source, source_id) WHERE source_id IS NOT NULL;

      -- Unique constraint for Google Place ID
      CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_google_place_id_unique
        ON businesses(google_place_id) WHERE google_place_id IS NOT NULL;
    `);
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================== BUSINESS CRUD ====================

  // Insert a new business
  insertBusiness(data: BusinessInsert): Business {
    const db = this.getInstance();
    const now = new Date().toISOString();
    const id = data.id ?? randomUUID();

    const stmt = db.prepare(`
      INSERT INTO businesses (
        id, name, business_type, category, address, city, state, county,
        phone, email, website_url, has_website, source, source_id, google_place_id,
        discovered_at, enriched_at, status, created_at, updated_at
      ) VALUES (
        @id, @name, @business_type, @category, @address, @city, @state, @county,
        @phone, @email, @website_url, @has_website, @source, @source_id, @google_place_id,
        @discovered_at, @enriched_at, @status, @created_at, @updated_at
      )
    `);

    stmt.run({
      id,
      name: data.name,
      business_type: data.business_type ?? null,
      category: data.category ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      county: data.county ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website_url: data.website_url ?? null,
      has_website: data.has_website ?? 0,
      source: data.source,
      source_id: data.source_id ?? null,
      google_place_id: data.google_place_id ?? null,
      discovered_at: data.discovered_at ?? now,
      enriched_at: null,
      status: data.status ?? 'discovered',
      created_at: now,
      updated_at: now,
    });

    return this.getBusinessById(id)!;
  }

  // Insert multiple businesses (batch insert)
  insertBusinesses(businesses: BusinessInsert[]): number {
    const db = this.getInstance();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, business_type, category, address, city, state, county,
        phone, email, website_url, has_website, source, source_id, google_place_id,
        discovered_at, enriched_at, status, created_at, updated_at
      ) VALUES (
        @id, @name, @business_type, @category, @address, @city, @state, @county,
        @phone, @email, @website_url, @has_website, @source, @source_id, @google_place_id,
        @discovered_at, @enriched_at, @status, @created_at, @updated_at
      )
    `);

    const insertMany = db.transaction((items: BusinessInsert[]) => {
      let count = 0;
      for (const data of items) {
        const result = stmt.run({
          id: data.id ?? randomUUID(),
          name: data.name,
          business_type: data.business_type ?? null,
          category: data.category ?? null,
          address: data.address ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          county: data.county ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          website_url: data.website_url ?? null,
          has_website: data.has_website ?? 0,
          source: data.source,
          source_id: data.source_id ?? null,
          google_place_id: data.google_place_id ?? null,
          discovered_at: data.discovered_at ?? now,
          enriched_at: null,
          status: data.status ?? 'discovered',
          created_at: now,
          updated_at: now,
        });
        if (result.changes > 0) count++;
      }
      return count;
    });

    return insertMany(businesses);
  }

  // Get business by ID
  getBusinessById(id: string): Business | null {
    const db = this.getInstance();
    const stmt = db.prepare('SELECT * FROM businesses WHERE id = ?');
    return (stmt.get(id) as Business) ?? null;
  }

  // Get business by source and source_id
  getBusinessBySourceId(source: string, sourceId: string): Business | null {
    const db = this.getInstance();
    const stmt = db.prepare('SELECT * FROM businesses WHERE source = ? AND source_id = ?');
    return (stmt.get(source, sourceId) as Business) ?? null;
  }

  // Get businesses by status
  getBusinessesByStatus(status: BusinessStatus, limit = 100, offset = 0): Business[] {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM businesses
      WHERE status = ?
      ORDER BY discovered_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(status, limit, offset) as Business[];
  }

  // Query businesses with options
  queryBusinesses(options: BusinessQueryOptions = {}): Business[] {
    const db = this.getInstance();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    if (options.source) {
      conditions.push('source = ?');
      params.push(options.source);
    }
    if (options.state) {
      conditions.push('state = ?');
      params.push(options.state);
    }
    if (options.city) {
      conditions.push('city = ?');
      params.push(options.city);
    }
    if (options.category) {
      conditions.push('category = ?');
      params.push(options.category);
    }
    if (options.hasWebsite !== undefined) {
      conditions.push('has_website = ?');
      params.push(options.hasWebsite ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    const stmt = db.prepare(`
      SELECT * FROM businesses
      ${whereClause}
      ORDER BY discovered_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(...params, limit, offset) as Business[];
  }

  // Get businesses without websites that need website generation
  getBusinessesNeedingWebsites(limit = 100): Business[] {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM businesses
      WHERE has_website = 0
        AND status IN ('discovered', 'enriched')
      ORDER BY discovered_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Business[];
  }

  // Update business
  updateBusiness(id: string, data: BusinessUpdate): Business | null {
    const db = this.getInstance();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = @updated_at'];
    const params: Record<string, unknown> = { id, updated_at: now };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = @${key}`);
        params[key] = value;
      }
    }

    const stmt = db.prepare(`
      UPDATE businesses
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = stmt.run(params);
    if (result.changes === 0) return null;

    return this.getBusinessById(id);
  }

  // Update business status
  updateBusinessStatus(id: string, status: BusinessStatus): Business | null {
    return this.updateBusiness(id, { status });
  }

  // Mark business as enriched
  markBusinessEnriched(
    id: string,
    enrichmentData: {
      website_url?: string | null;
      has_website: boolean;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
    }
  ): Business | null {
    return this.updateBusiness(id, {
      ...enrichmentData,
      has_website: enrichmentData.has_website ? 1 : 0,
      enriched_at: new Date().toISOString(),
      status: 'enriched',
    });
  }

  // Delete business
  deleteBusiness(id: string): boolean {
    const db = this.getInstance();
    const stmt = db.prepare('DELETE FROM businesses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Count businesses by status
  countBusinessesByStatus(): Record<BusinessStatus, number> {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM businesses
      GROUP BY status
    `);
    const rows = stmt.all() as Array<{ status: BusinessStatus; count: number }>;

    const counts: Record<BusinessStatus, number> = {
      discovered: 0,
      enriched: 0,
      website_generated: 0,
      deployed: 0,
      contacted: 0,
      sold: 0,
    };

    for (const row of rows) {
      counts[row.status] = row.count;
    }

    return counts;
  }

  // ==================== WEBSITE CRUD ====================

  // Insert a generated website
  insertWebsite(data: WebsiteInsert): GeneratedWebsite {
    const db = this.getInstance();
    const now = new Date().toISOString();
    const id = data.id ?? randomUUID();

    const stmt = db.prepare(`
      INSERT INTO generated_websites (
        id, business_id, template_name, variation_number,
        html_content, preview_url, deployed_at, created_at
      ) VALUES (
        @id, @business_id, @template_name, @variation_number,
        @html_content, @preview_url, @deployed_at, @created_at
      )
    `);

    stmt.run({
      id,
      business_id: data.business_id,
      template_name: data.template_name,
      variation_number: data.variation_number ?? 1,
      html_content: data.html_content,
      preview_url: data.preview_url ?? null,
      deployed_at: null,
      created_at: now,
    });

    // Update business status
    this.updateBusinessStatus(data.business_id, 'website_generated');

    return this.getWebsiteById(id)!;
  }

  // Get website by ID
  getWebsiteById(id: string): GeneratedWebsite | null {
    const db = this.getInstance();
    const stmt = db.prepare('SELECT * FROM generated_websites WHERE id = ?');
    return (stmt.get(id) as GeneratedWebsite) ?? null;
  }

  // Get websites by business ID
  getWebsitesByBusinessId(businessId: string): GeneratedWebsite[] {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM generated_websites
      WHERE business_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(businessId) as GeneratedWebsite[];
  }

  // Get latest website for a business
  getLatestWebsiteForBusiness(businessId: string): GeneratedWebsite | null {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM generated_websites
      WHERE business_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return (stmt.get(businessId) as GeneratedWebsite) ?? null;
  }

  // Get websites pending deployment
  getWebsitesPendingDeployment(limit = 100): GeneratedWebsite[] {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM generated_websites
      WHERE deployed_at IS NULL
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(limit) as GeneratedWebsite[];
  }

  // Update website
  updateWebsite(id: string, data: WebsiteUpdate): GeneratedWebsite | null {
    const db = this.getInstance();

    const updates: string[] = [];
    const params: Record<string, unknown> = { id };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.getWebsiteById(id);

    const stmt = db.prepare(`
      UPDATE generated_websites
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = stmt.run(params);
    if (result.changes === 0) return null;

    return this.getWebsiteById(id);
  }

  // Mark website as deployed
  markWebsiteDeployed(id: string, previewUrl: string): GeneratedWebsite | null {
    const website = this.updateWebsite(id, {
      preview_url: previewUrl,
      deployed_at: new Date().toISOString(),
    });

    if (website) {
      this.updateBusinessStatus(website.business_id, 'deployed');
    }

    return website;
  }

  // Delete website
  deleteWebsite(id: string): boolean {
    const db = this.getInstance();
    const stmt = db.prepare('DELETE FROM generated_websites WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== OUTREACH CRUD ====================

  // Log an outreach attempt
  logOutreach(data: OutreachInsert): OutreachLog {
    const db = this.getInstance();
    const now = new Date().toISOString();
    const id = data.id ?? randomUUID();

    const stmt = db.prepare(`
      INSERT INTO outreach_log (
        id, business_id, method, sent_at, response, notes
      ) VALUES (
        @id, @business_id, @method, @sent_at, @response, @notes
      )
    `);

    stmt.run({
      id,
      business_id: data.business_id,
      method: data.method,
      sent_at: data.sent_at ?? now,
      response: data.response ?? null,
      notes: data.notes ?? null,
    });

    // Update business status if first contact
    this.updateBusinessStatus(data.business_id, 'contacted');

    return this.getOutreachById(id)!;
  }

  // Get outreach by ID
  getOutreachById(id: string): OutreachLog | null {
    const db = this.getInstance();
    const stmt = db.prepare('SELECT * FROM outreach_log WHERE id = ?');
    return (stmt.get(id) as OutreachLog) ?? null;
  }

  // Get outreach history for a business
  getOutreachByBusinessId(businessId: string): OutreachLog[] {
    const db = this.getInstance();
    const stmt = db.prepare(`
      SELECT * FROM outreach_log
      WHERE business_id = ?
      ORDER BY sent_at DESC
    `);
    return stmt.all(businessId) as OutreachLog[];
  }

  // Update outreach with response
  updateOutreachResponse(id: string, response: string, notes?: string): OutreachLog | null {
    const db = this.getInstance();
    const stmt = db.prepare(`
      UPDATE outreach_log
      SET response = @response, notes = @notes
      WHERE id = @id
    `);

    const result = stmt.run({ id, response, notes: notes ?? null });
    if (result.changes === 0) return null;

    return this.getOutreachById(id);
  }

  // ==================== STATS & UTILITIES ====================

  // Get database statistics
  getStats(): DatabaseStats {
    const db = this.getInstance();

    const totalBusinesses = (
      db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number }
    ).count;

    const totalWebsites = (
      db.prepare('SELECT COUNT(*) as count FROM generated_websites').get() as { count: number }
    ).count;

    const totalOutreach = (
      db.prepare('SELECT COUNT(*) as count FROM outreach_log').get() as { count: number }
    ).count;

    const byStatus = this.countBusinessesByStatus();

    const sourceRows = db
      .prepare('SELECT source, COUNT(*) as count FROM businesses GROUP BY source')
      .all() as Array<{ source: string; count: number }>;

    const bySource: Record<string, number> = {};
    for (const row of sourceRows) {
      bySource[row.source] = row.count;
    }

    return {
      totalBusinesses,
      byStatus,
      bySource,
      totalWebsites,
      totalOutreach,
    };
  }

  // Check if business exists by source
  businessExistsBySource(source: string, sourceId: string): boolean {
    const db = this.getInstance();
    const stmt = db.prepare(
      'SELECT 1 FROM businesses WHERE source = ? AND source_id = ? LIMIT 1'
    );
    return stmt.get(source, sourceId) !== undefined;
  }

  // Check if business exists by Google Place ID
  businessExistsByGooglePlaceId(placeId: string): boolean {
    const db = this.getInstance();
    const stmt = db.prepare(
      'SELECT 1 FROM businesses WHERE google_place_id = ? LIMIT 1'
    );
    return stmt.get(placeId) !== undefined;
  }

  // Get raw database instance for advanced queries
  raw(): Database.Database {
    return this.getInstance();
  }
}

// Export singleton instance
export const db = new DatabaseManager();

// Also export the class for testing
export { DatabaseManager };
