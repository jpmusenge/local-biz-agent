import 'dotenv/config';

// Local Biz Agent - Main Entry Point
// This agent discovers newly registered businesses and generates websites for them

export { discovery } from './modules/discovery/index.js';
export { enrichment } from './modules/enrichment/index.js';
export { generator } from './modules/generator/index.js';
export { deployment } from './modules/deployment/index.js';
export { outreach } from './modules/outreach/index.js';
export { db } from './database/index.js';
export { config } from './config/index.js';

console.log('Local Biz Agent initialized');
