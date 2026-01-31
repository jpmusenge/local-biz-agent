#!/usr/bin/env ts-node
/**
 * Database Module Test Script
 * Tests basic CRUD operations for businesses, websites, and outreach
 */

import { db } from '../src/database/index.js';

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('DATABASE MODULE TEST');
  console.log('='.repeat(50));

  // Use a test database file
  const testDbPath = './data/test-local-biz.db';
  console.log(`\nInitializing database at: ${testDbPath}`);
  db.initialize({ path: testDbPath });

  try {
    // 1. Insert a sample business
    console.log('\n--- INSERT BUSINESS ---');
    const business = db.insertBusiness({
      name: "Joe's Barber Shop",
      business_type: 'LLC',
      city: 'Holly Springs',
      state: 'MS',
      county: 'Marshall',
      source: 'ms_sos',
      source_id: 'TEST-001',
      status: 'discovered',
    });
    console.log('Inserted business:');
    console.log(JSON.stringify(business, null, 2));

    // 2. Retrieve it back
    console.log('\n--- GET BUSINESS BY ID ---');
    const retrieved = db.getBusinessById(business.id);
    console.log('Retrieved business:');
    console.log(`  ID: ${retrieved?.id}`);
    console.log(`  Name: ${retrieved?.name}`);
    console.log(`  Type: ${retrieved?.business_type}`);
    console.log(`  Location: ${retrieved?.city}, ${retrieved?.state} (${retrieved?.county} County)`);
    console.log(`  Source: ${retrieved?.source}`);
    console.log(`  Status: ${retrieved?.status}`);

    // 3. Update status to "enriched"
    console.log('\n--- UPDATE STATUS TO ENRICHED ---');
    const enriched = db.markBusinessEnriched(business.id, {
      has_website: false,
      phone: '662-555-1234',
      address: '123 Main Street',
    });
    console.log('Updated business:');
    console.log(`  Status: ${enriched?.status}`);
    console.log(`  Phone: ${enriched?.phone}`);
    console.log(`  Address: ${enriched?.address}`);
    console.log(`  Has Website: ${enriched?.has_website === 1 ? 'Yes' : 'No'}`);
    console.log(`  Enriched At: ${enriched?.enriched_at}`);

    // 4. Retrieve again to confirm update
    console.log('\n--- CONFIRM UPDATE ---');
    const confirmed = db.getBusinessById(business.id);
    console.log(`Status confirmed: ${confirmed?.status}`);
    console.log(`Updated at: ${confirmed?.updated_at}`);

    // 5. Insert a generated website
    console.log('\n--- INSERT GENERATED WEBSITE ---');
    const website = db.insertWebsite({
      business_id: business.id,
      template_name: 'modern-barber',
      variation_number: 1,
      html_content: `
<!DOCTYPE html>
<html>
<head><title>Joe's Barber Shop</title></head>
<body>
  <h1>Welcome to Joe's Barber Shop</h1>
  <p>The best cuts in Holly Springs, MS!</p>
</body>
</html>`.trim(),
    });
    console.log('Inserted website:');
    console.log(`  ID: ${website.id}`);
    console.log(`  Business ID: ${website.business_id}`);
    console.log(`  Template: ${website.template_name}`);
    console.log(`  Variation: ${website.variation_number}`);
    console.log(`  Created At: ${website.created_at}`);

    // 6. Retrieve websites for this business
    console.log('\n--- GET WEBSITES BY BUSINESS ID ---');
    const websites = db.getWebsitesByBusinessId(business.id);
    console.log(`Found ${websites.length} website(s):`);
    for (const w of websites) {
      console.log(`  - ${w.template_name} (v${w.variation_number})`);
      console.log(`    Preview: ${w.preview_url ?? 'Not deployed'}`);
    }

    // Check business status was updated
    const afterWebsite = db.getBusinessById(business.id);
    console.log(`\nBusiness status after website insert: ${afterWebsite?.status}`);

    // 7. Get database stats
    console.log('\n--- DATABASE STATS ---');
    const stats = db.getStats();
    console.log(`Total businesses: ${stats.totalBusinesses}`);
    console.log(`Total websites: ${stats.totalWebsites}`);
    console.log(`Total outreach: ${stats.totalOutreach}`);
    console.log('By status:', stats.byStatus);
    console.log('By source:', stats.bySource);

    // 8. Clean up - delete test data
    console.log('\n--- CLEANUP ---');
    const websiteDeleted = db.deleteWebsite(website.id);
    console.log(`Website deleted: ${websiteDeleted}`);

    const businessDeleted = db.deleteBusiness(business.id);
    console.log(`Business deleted: ${businessDeleted}`);

    // Verify cleanup
    const finalStats = db.getStats();
    console.log(`\nFinal stats - Businesses: ${finalStats.totalBusinesses}, Websites: ${finalStats.totalWebsites}`);

    console.log('\n' + '='.repeat(50));
    console.log('ALL TESTS PASSED!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\nTEST FAILED:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
