#!/usr/bin/env tsx
/**
 * Test Premium Website Generation
 * Generates a premium barber shop website in mock mode and opens it in the browser.
 *
 * Usage:
 *   npm run test:premium
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { WebsiteTemplate, TEMPLATE_LABELS } from '../src/modules/generator/types.js';
import type { BusinessInfo } from '../src/modules/generator/types.js';
import { getIndustryData } from '../src/modules/generator/templates/industry/index.js';

// Inline mock generation to avoid needing database / config setup
async function generateMockPremium(business: BusinessInfo, template: WebsiteTemplate): Promise<string> {
  // Dynamically import the client — it will run in mock mode since no API key is set
  // But to avoid config/db dependencies, we replicate the mock logic directly here
  const { ClaudeClient } = await import('../src/modules/generator/claude-client.js');
  const client = new ClaudeClient();
  return client.generateWebsite(business, template);
}

async function main(): Promise<void> {
  console.log('Premium Website Generator - Test Script\n');

  const business: BusinessInfo = {
    id: 'test-barber-001',
    name: "Marcus & Sons Barbershop",
    businessType: 'Barber Shops',
    category: 'Barber Shops',
    city: 'Atlanta',
    state: 'GA',
    phone: '(404) 555-0192',
    email: 'info@marcusandsons.com',
    address: '1247 Peachtree St NE, Atlanta, GA 30309',
  };

  const template = WebsiteTemplate.SUSPENDED_DARK;
  const templateLabel = TEMPLATE_LABELS[template];

  console.log(`Business: ${business.name}`);
  console.log(`Template: ${templateLabel}`);
  console.log(`Industry: ${business.businessType}`);
  console.log('');

  try {
    console.log('Generating premium website...');
    const html = await generateMockPremium(business, template);

    // Ensure output directory exists
    const outputDir = './output';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = 'premium-barber-preview.html';
    const filepath = join(outputDir, filename);
    writeFileSync(filepath, html);

    console.log(`\nSaved to: ${filepath}`);
    console.log(`Size: ${html.length.toLocaleString()} characters`);

    // Verify key features
    const checks = [
      { name: 'Tailwind CSS CDN', pattern: 'cdn.tailwindcss.com' },
      { name: 'Lucide Icons CDN', pattern: 'unpkg.com/lucide' },
      { name: 'Google Fonts', pattern: 'fonts.googleapis.com' },
      { name: 'Tailwind Config', pattern: 'tailwind.config' },
      { name: 'Lucide Init', pattern: 'lucide.createIcons' },
      { name: 'Intersection Observer', pattern: 'IntersectionObserver' },
      { name: 'Mobile Menu', pattern: 'mobile-menu' },
      { name: 'Scroll Animations', pattern: 'animate-on-scroll' },
    ];

    console.log('\nFeature checks:');
    for (const check of checks) {
      const found = html.includes(check.pattern);
      console.log(`  ${found ? '\u2713' : '\u2717'} ${check.name}`);
    }

    // Open in browser
    console.log('\nOpening in browser...');
    execSync(`open "${filepath}"`);

    console.log('Done!');
  } catch (error) {
    console.error('Error generating website:', error);
    process.exit(1);
  }
}

main();
