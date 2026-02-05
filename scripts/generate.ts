#!/usr/bin/env tsx
/**
 * Website Generation Script
 * Generate AI-powered websites for businesses without websites
 *
 * Usage:
 *   npm run generate                    # Generate for discovered businesses
 *   npm run generate -- --limit=5       # Limit number of businesses
 *   npm run generate -- --templates=1   # Generate only 1 template per business
 *
 * Prerequisites:
 *   - Run "npm run discover" first to populate the database
 *   - Set ANTHROPIC_API_KEY in .env for AI generation (mock mode otherwise)
 */

import 'dotenv/config';
import { GeneratorService, TEMPLATE_LABELS, WebsiteTemplate } from '../src/modules/generator/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('LOCAL BIZ AGENT - WEBSITE GENERATION');
  console.log('='.repeat(60));
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const templatesArg = args.find((arg) => arg.startsWith('--templates='));
  const saveArg = args.includes('--save-html');

  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '1', 10) : 1;
  const templatesPerBusiness = templatesArg ? parseInt(templatesArg.split('=')[1] ?? '2', 10) : 2;

  logger.info(`Configuration:`);
  logger.info(`  Max businesses to process: ${limit}`);
  logger.info(`  Templates per business: ${templatesPerBusiness}`);
  logger.info(`  Save HTML files: ${saveArg ? 'Yes' : 'No'}`);
  logger.info('');

  // Initialize database
  db.initialize();

  try {
    // Create generator service
    const generator = new GeneratorService({
      templatesPerBusiness,
      includeFeatures: [
        'contact_form',
        'about_section',
        'services_list',
        'call_to_action',
        'hours_of_operation',
        'testimonials',
      ],
    });

    // Get businesses needing websites
    const businesses = generator.getBusinessesNeedingGeneration(limit);

    if (businesses.length === 0) {
      console.log('');
      console.log('No businesses found that need website generation.');
      console.log('');
      console.log('To get started:');
      console.log('  1. Run "npm run discover" to find businesses');
      console.log('  2. Then run "npm run generate" again');
      console.log('');

      // Show current database stats
      const stats = db.getStats();
      console.log('Current database stats:');
      console.log(`  Total businesses: ${stats.totalBusinesses}`);
      console.log(`  By status:`, stats.byStatus);
      return;
    }

    logger.info(`Found ${businesses.length} business(es) needing websites`);
    console.log('');

    // Generate websites
    const summary = await generator.generateForBusinesses(businesses);

    // Print detailed results
    console.log('');
    console.log('='.repeat(60));
    console.log('GENERATION RESULTS');
    console.log('='.repeat(60));
    console.log('');

    for (const result of summary.results) {
      console.log(`Business: ${result.businessName}`);
      console.log(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`  Websites Generated: ${result.websitesGenerated}`);

      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      // If save flag is set, save HTML files
      if (saveArg && result.success) {
        const websites = db.getWebsitesByBusinessId(result.businessId);
        for (const website of websites) {
          const outputDir = './output/websites';
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }

          const filename = `${result.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${website.template_name}.html`;
          const filepath = join(outputDir, filename);
          writeFileSync(filepath, website.html_content);
          console.log(`  Saved: ${filepath}`);
        }
      }
      console.log('');
    }

    // Show updated database stats
    const stats = db.getStats();
    console.log('Database Stats After Generation:');
    console.log(`  Total businesses: ${stats.totalBusinesses}`);
    console.log(`  Total websites: ${stats.totalWebsites}`);
    console.log(`  By status:`, stats.byStatus);
    console.log('');

    if (summary.successfulGenerations > 0) {
      console.log(`SUCCESS: Generated ${summary.totalWebsitesCreated} websites for ${summary.successfulGenerations} business(es)!`);
      console.log('');
      console.log('Next steps:');
      console.log('  1. Run "npm run generate -- --save-html" to save HTML files');
      console.log('  2. Run "npm run deploy" to deploy to Vercel');
    } else {
      console.log('No websites were generated. Check the logs above for errors.');
    }

  } catch (error) {
    logger.error('Generation failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
