#!/usr/bin/env tsx
/**
 * Test Barber Shop Premium Website Generation
 * Generates a premium barbershop website using Claude (or Gemini with --provider=gemini)
 * and opens it in the browser for review.
 *
 * Usage:
 *   npm run test:barber-premium
 *   npm run test:barber-premium -- --provider=gemini
 *   npm run test:barber-premium -- --mock          # skip API, use ClaudeClient mock template
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import type { BusinessInfo } from '../src/modules/generator/types.js';
import { WebsiteTemplate } from '../src/modules/generator/types.js';
import { checkWebsiteQuality } from '../src/modules/generator/templates/restaurant-premium.js';
import { db } from '../src/database/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toBusinessInfo(row: Record<string, unknown>): BusinessInfo {
  return {
    id:           String(row['id'] ?? ''),
    name:         String(row['name'] ?? ''),
    businessType: String(row['business_type'] ?? row['category'] ?? 'Barber Shop'),
    category:     String(row['category'] ?? ''),
    city:         String(row['city'] ?? ''),
    state:        String(row['state'] ?? ''),
    phone:        row['phone'] ? String(row['phone']) : undefined,
    email:        row['email'] ? String(row['email']) : undefined,
    address:      row['address'] ? String(row['address']) : undefined,
  };
}

/** Find a barber shop from the DB, or return mock data if none exist. */
function getBarberBusiness(): BusinessInfo {
  try {
    db.initialize();
    const raw = db.raw();
    const row = raw.prepare(`
      SELECT * FROM businesses
      WHERE (LOWER(category) LIKE '%barber%'
          OR LOWER(business_type) LIKE '%barber%')
      ORDER BY discovered_at DESC
      LIMIT 1
    `).get() as Record<string, unknown> | undefined;

    if (row) {
      const biz = toBusinessInfo(row);
      console.log(`Using DB barbershop: ${biz.name} (${biz.city}, ${biz.state})`);
      return biz;
    }
  } catch {
    // DB not initialised — fall through to mock
  } finally {
    try { db.close(); } catch { /* ignore */ }
  }

  console.log('No barber shops in DB — using mock data.');
  return {
    id:           'test-barber-001',
    name:         "Sharp & Sons Barbershop",
    businessType: 'Barber Shop',
    category:     'Barber Shop',
    city:         'Holly Springs',
    state:        'MS',
    phone:        '(662) 252-0193',
    email:        'info@sharpsons.com',
    address:      '147 Memphis St, Holly Springs, MS 38635',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useMock = args.includes('--mock');
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider = providerArg?.split('=')[1] ?? 'claude';

  console.log('='.repeat(60));
  console.log('BARBER SHOP PREMIUM — Website Generator Test');
  console.log('='.repeat(60));
  console.log('');

  const business = getBarberBusiness();

  console.log(`Business : ${business.name}`);
  console.log(`Location : ${business.city}, ${business.state}`);
  if (business.phone)   console.log(`Phone    : ${business.phone}`);
  if (business.address) console.log(`Address  : ${business.address}`);
  console.log(`Provider : ${useMock ? 'mock (ClaudeClient template)' : provider}`);
  console.log('');

  let html: string;

  if (useMock) {
    const { ClaudeClient } = await import('../src/modules/generator/claude-client.js');
    const client = new ClaudeClient();
    html = await client.generateWebsite(business, WebsiteTemplate.SUSPENDED_DARK);
  } else if (provider === 'gemini') {
    const { GeminiClient } = await import('../src/modules/generator/gemini-client.js');
    const client = new GeminiClient();
    if (client.isInMockMode()) {
      console.error('GEMINI_API_KEY is not set. Add it to .env or use --mock flag.');
      process.exit(1);
    }
    html = await client.generateWebsite(business, WebsiteTemplate.SUSPENDED_DARK);
  } else {
    const { ClaudeClient } = await import('../src/modules/generator/claude-client.js');
    const client = new ClaudeClient();
    if (client.isInMockMode()) {
      console.log('ANTHROPIC_API_KEY not set — falling back to mock mode.\n');
    }
    html = await client.generateWebsite(business, WebsiteTemplate.SUSPENDED_DARK);
  }

  // ── Quality check ─────────────────────────────────────────────────────────
  console.log('');
  console.log('Running quality check...');
  const quality = checkWebsiteQuality(html);

  if (quality.passed) {
    console.log('  PASSED — no hard failures detected');
  } else {
    console.log(`  FAILED — ${quality.issues.length} issue(s):`);
    for (const issue of quality.issues) {
      console.log(`    ✗ ${issue}`);
    }
  }
  if (quality.warnings.length > 0) {
    console.log(`  Warnings (${quality.warnings.length}):`);
    for (const w of quality.warnings) {
      console.log(`    ⚠ ${w}`);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const outputDir = './output';
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const filename = 'barber-premium-preview.html';
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, html, 'utf8');

  console.log('');
  console.log(`Saved  : ${filepath}`);
  console.log(`Size   : ${html.length.toLocaleString()} chars`);

  // ── Feature checks ────────────────────────────────────────────────────────
  const checks = [
    { label: 'Playfair Display font',    pattern: 'Playfair+Display' },
    { label: 'Tailwind CSS CDN',         pattern: 'cdn.tailwindcss.com' },
    { label: 'Lucide icons CDN',         pattern: 'unpkg.com/lucide' },
    { label: 'Tailwind custom colors',   pattern: 'shop-black' },
    { label: 'Unsplash real images',     pattern: 'images.unsplash.com' },
    { label: 'JSON-LD HairSalon schema', pattern: 'application/ld+json' },
    { label: 'Open Graph tags',          pattern: 'og:title' },
    { label: 'Booking section',          pattern: 'Book' },
    { label: 'Smooth scroll',            pattern: 'scroll-behavior' },
    { label: 'IntersectionObserver',     pattern: 'IntersectionObserver' },
    { label: 'Lucide init',              pattern: 'lucide.createIcons' },
  ];

  console.log('');
  console.log('Feature checks:');
  for (const check of checks) {
    console.log(`  ${html.includes(check.pattern) ? '✓' : '✗'} ${check.label}`);
  }

  // ── Open in browser ───────────────────────────────────────────────────────
  console.log('');
  console.log('Opening in browser...');
  execSync(`open "${filepath}"`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
