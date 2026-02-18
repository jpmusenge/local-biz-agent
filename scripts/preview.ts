#!/usr/bin/env tsx
/**
 * Preview Script
 * Extract a generated website from the database and open it in the browser
 *
 * Usage:
 *   npm run preview                     # Preview the latest generated website
 *   npm run preview -- --id=<id>        # Preview a specific website by ID
 *   npm run preview -- --list           # List all generated websites
 */

import 'dotenv/config';
import { db } from '../src/database/index.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

function main(): void {
  const args = process.argv.slice(2);
  const listMode = args.includes('--list');
  const idArg = args.find((arg) => arg.startsWith('--id='));
  const websiteId = idArg?.split('=')[1];

  db.initialize();

  try {
    const rawDb = db.raw();

    if (listMode) {
      // List all generated websites with business names
      const websites = rawDb.prepare(`
        SELECT gw.id, gw.template_name, gw.variation_number, gw.created_at,
               LENGTH(gw.html_content) as size_chars,
               b.name as business_name, b.city, b.state, b.business_type
        FROM generated_websites gw
        JOIN businesses b ON gw.business_id = b.id
        ORDER BY gw.created_at DESC
      `).all() as Array<{
        id: string; template_name: string; variation_number: number;
        created_at: string; size_chars: number;
        business_name: string; city: string; state: string; business_type: string;
      }>;

      if (websites.length === 0) {
        console.log('No generated websites found. Run "npm run generate" first.');
        return;
      }

      console.log('Generated Websites:\n');
      console.log(`${'ID'.padEnd(38)} ${'Business'.padEnd(25)} ${'Template'.padEnd(22)} ${'Size'.padEnd(8)} Created`);
      console.log('-'.repeat(110));

      for (const w of websites) {
        console.log(
          `${w.id.padEnd(38)} ${w.business_name.padEnd(25)} ${w.template_name.padEnd(22)} ${String(w.size_chars).padEnd(8)} ${w.created_at.slice(0, 10)}`
        );
      }

      console.log(`\nTotal: ${websites.length} website(s)`);
      console.log('\nTo preview one: npm run preview -- --id=<ID>');
      return;
    }

    // Get the website to preview
    let html: string;
    let filename: string;

    if (websiteId) {
      const website = rawDb.prepare(`
        SELECT gw.*, b.name as business_name
        FROM generated_websites gw
        JOIN businesses b ON gw.business_id = b.id
        WHERE gw.id = ?
      `).get(websiteId) as { html_content: string; business_name: string; template_name: string } | undefined;

      if (!website) {
        console.log(`Website with ID "${websiteId}" not found.`);
        console.log('Run "npm run preview -- --list" to see available websites.');
        return;
      }

      html = website.html_content;
      filename = `${website.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${website.template_name}.html`;
      console.log(`Previewing: ${website.business_name} (${website.template_name})`);
    } else {
      // Get the most recent website
      const website = rawDb.prepare(`
        SELECT gw.*, b.name as business_name
        FROM generated_websites gw
        JOIN businesses b ON gw.business_id = b.id
        ORDER BY gw.created_at DESC
        LIMIT 1
      `).get() as { html_content: string; business_name: string; template_name: string } | undefined;

      if (!website) {
        console.log('No generated websites found. Run "npm run generate" first.');
        return;
      }

      html = website.html_content;
      filename = `${website.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${website.template_name}.html`;
      console.log(`Previewing latest: ${website.business_name} (${website.template_name})`);
    }

    // Save to output/preview.html
    const outputDir = './output';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const previewPath = join(outputDir, 'preview.html');
    writeFileSync(previewPath, html);
    console.log(`Saved to: ${previewPath} (${html.length} chars)`);

    // Also save with descriptive name
    const namedPath = join(outputDir, filename);
    writeFileSync(namedPath, html);
    console.log(`Saved to: ${namedPath}`);

    // Open in browser
    console.log('\nOpening in browser...');
    execSync(`open "${previewPath}"`);
  } finally {
    db.close();
  }
}

main();
