#!/usr/bin/env ts-node
/**
 * Website Generation Script
 * Generate websites for businesses without existing websites
 *
 * Usage: npm run generate -- --limit=10 --style=modern
 */

import 'dotenv/config';
import { generator } from '../src/modules/generator/index.js';
import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';

async function main(): Promise<void> {
  logger.info('Starting website generation...');

  // Initialize database
  db.init();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const styleArg = args.find((arg) => arg.startsWith('--style='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '10', 10) : 10;
  const style = (styleArg?.split('=')[1] ?? 'modern') as 'modern' | 'classic' | 'minimal' | 'bold';

  logger.info(`Generating up to ${limit} websites with ${style} style`);

  try {
    // TODO: Fetch businesses needing websites from database
    const businessesToProcess: Array<{ id: string; name: string; info: Record<string, unknown> }> =
      [];

    let generated = 0;

    for (const business of businessesToProcess) {
      const website = await generator.generateWebsite(business.name, business.info, {
        style,
        includeContactForm: true,
        includeSocialLinks: false,
      });

      if (website) {
        generated++;
        logger.info(`Generated website for: ${business.name}`);
        // TODO: Save website to database
      }
    }

    logger.info(`Generated ${generated} websites`);
    logger.info('Generation complete!');
  } catch (error) {
    logger.error('Generation failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
