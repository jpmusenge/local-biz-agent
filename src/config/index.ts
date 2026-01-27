// Configuration Module
// Centralized configuration management

import 'dotenv/config';

// TODO: Add configuration validation
// TODO: Add support for different environments (dev, staging, prod)

export interface AppConfig {
  // Google Places API
  googlePlacesApiKey: string;

  // AI API Keys
  openaiApiKey: string;
  anthropicApiKey: string;

  // Vercel
  vercelToken: string;
  vercelOrgId: string;
  vercelProjectId: string;

  // Email
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;

  // Database
  databasePath: string;

  // App Settings
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
}

const requiredEnvVars: string[] = [
  // Add required env vars here as modules are implemented
];

// Validate that all required environment variables are set
export const validateConfig = (): string[] => {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return missing;
};

// Get a single config value
export const get = (key: string): string | undefined => {
  return process.env[key];
};

// Get a required config value (throws if missing)
export const getRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Get all config as typed object
export const getAll = (): Partial<AppConfig> => {
  return {
    googlePlacesApiKey: process.env['GOOGLE_PLACES_API_KEY'],
    openaiApiKey: process.env['OPENAI_API_KEY'],
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
    vercelToken: process.env['VERCEL_TOKEN'],
    vercelOrgId: process.env['VERCEL_ORG_ID'],
    vercelProjectId: process.env['VERCEL_PROJECT_ID'],
    smtpHost: process.env['SMTP_HOST'],
    smtpPort: process.env['SMTP_PORT'] ? parseInt(process.env['SMTP_PORT'], 10) : undefined,
    smtpUser: process.env['SMTP_USER'],
    smtpPass: process.env['SMTP_PASS'],
    emailFrom: process.env['EMAIL_FROM'],
    databasePath: process.env['DATABASE_PATH'] ?? './data/local-biz-agent.db',
    environment: (process.env['NODE_ENV'] as AppConfig['environment']) ?? 'development',
    debug: process.env['DEBUG'] === 'true',
  };
};

// Check if running in production
export const isProduction = (): boolean => {
  return process.env['NODE_ENV'] === 'production';
};

// Check if running in development
export const isDevelopment = (): boolean => {
  return process.env['NODE_ENV'] !== 'production';
};

export const config = {
  get,
  getRequired,
  getAll,
  validateConfig,
  isProduction,
  isDevelopment,
};
