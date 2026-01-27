// Database Module
// SQLite database setup and management using better-sqlite3

import Database from 'better-sqlite3';
import { config } from '../config/index.js';

// TODO: Initialize database with proper schema
// Tables needed:
// - businesses: discovered businesses
// - enrichments: Google Places data
// - websites: generated website data
// - deployments: deployment records
// - outreach: email campaign tracking

export interface DatabaseConfig {
  path: string;
  verbose?: boolean;
}

let dbInstance: Database.Database | null = null;

export const db = {
  // Initialize the database connection
  init: (dbConfig?: DatabaseConfig): Database.Database => {
    const dbPath = dbConfig?.path ?? config.get('DATABASE_PATH') ?? './data/local-biz-agent.db';

    dbInstance = new Database(dbPath, {
      verbose: dbConfig?.verbose ? console.log : undefined,
    });

    // Enable WAL mode for better performance
    dbInstance.pragma('journal_mode = WAL');

    // Run migrations
    db.migrate();

    return dbInstance;
  },

  // Get the database instance
  getInstance: (): Database.Database => {
    if (!dbInstance) {
      return db.init();
    }
    return dbInstance;
  },

  // Run database migrations
  migrate: (): void => {
    const database = db.getInstance();

    // TODO: Implement proper migrations
    database.exec(`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        registration_date TEXT,
        state TEXT,
        entity_type TEXT,
        address TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enrichments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        place_id TEXT,
        has_website INTEGER DEFAULT 0,
        website_url TEXT,
        phone_number TEXT,
        formatted_address TEXT,
        rating REAL,
        review_count INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        html TEXT,
        css TEXT,
        metadata TEXT,
        status TEXT DEFAULT 'generated',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        website_id INTEGER NOT NULL,
        deployment_id TEXT,
        url TEXT,
        preview_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id),
        FOREIGN KEY (website_id) REFERENCES websites(id)
      );

      CREATE TABLE IF NOT EXISTS outreach (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        email TEXT,
        template_id TEXT,
        sent_at TEXT,
        opened_at TEXT,
        clicked_at TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state);
      CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
      CREATE INDEX IF NOT EXISTS idx_enrichments_business_id ON enrichments(business_id);
      CREATE INDEX IF NOT EXISTS idx_websites_business_id ON websites(business_id);
      CREATE INDEX IF NOT EXISTS idx_deployments_business_id ON deployments(business_id);
    `);
  },

  // Close the database connection
  close: (): void => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  },
};
