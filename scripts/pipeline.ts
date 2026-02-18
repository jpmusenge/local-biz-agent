#!/usr/bin/env tsx
/**
 * Full Pipeline Script
 * Orchestrates the complete agent workflow: Discovery -> Generation -> Deployment
 *
 * Usage:
 *   npm run pipeline                    # Run full pipeline (default 5 businesses per step)
 *   npm run pipeline -- --limit=10      # Process up to 10 businesses per step
 *   npm run pipeline -- --discover-only # Just run discovery
 *   npm run pipeline -- --generate-only # Just run generation
 *   npm run pipeline -- --deploy-only   # Just run deployment
 *   npm run pipeline -- --dry-run       # Show what would happen without changes
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

import { db } from '../src/database/index.js';
import { logger } from '../src/utils/index.js';
import {
  DiscoveryService,
  BusinessCategory,
  type SearchArea,
  type DiscoverySummary,
} from '../src/modules/discovery/index.js';
import {
  GeneratorService,
  type GenerationSummary,
} from '../src/modules/generator/index.js';
import {
  DeploymentService,
  type BatchDeploymentResult,
} from '../src/modules/deployment/index.js';

// ==================== TYPES ====================

interface PipelineConfig {
  limit: number;
  discoverOnly: boolean;
  generateOnly: boolean;
  deployOnly: boolean;
  dryRun: boolean;
}

interface PipelineResults {
  discovery?: DiscoverySummary;
  generation?: GenerationSummary;
  deployment?: BatchDeploymentResult;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

interface StepResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== CONFIGURATION ====================

// Default discovery configuration - customize these for your target markets
const DEFAULT_AREAS: SearchArea[] = [
  { city: 'Holly Springs', state: 'MS', radiusMiles: 15 },
  { city: 'Oxford', state: 'MS', radiusMiles: 10 },
];

const DEFAULT_CATEGORIES: BusinessCategory[] = [
  BusinessCategory.BARBER_SHOP,
  BusinessCategory.RESTAURANT,
  BusinessCategory.AUTO_REPAIR,
  BusinessCategory.SALON,
];

// ==================== PIPELINE STEPS ====================

/**
 * Step 1: Discovery
 * Find businesses without websites using Google Places API
 */
async function runDiscovery(
  config: PipelineConfig
): Promise<StepResult<DiscoverySummary>> {
  logger.info('\n' + '='.repeat(60));
  logger.info('[STEP 1/3] DISCOVERY');
  logger.info('='.repeat(60));

  if (config.dryRun) {
    logger.info('[DRY RUN] Would search for businesses in:');
    for (const area of DEFAULT_AREAS) {
      logger.info(`  - ${area.city}, ${area.state} (${area.radiusMiles} mile radius)`);
    }
    logger.info('Categories:', DEFAULT_CATEGORIES.join(', '));
    return { success: true };
  }

  try {
    const discovery = new DiscoveryService({
      areas: DEFAULT_AREAS,
      categories: DEFAULT_CATEGORIES,
      maxResultsPerSearch: config.limit,
    });

    const summary = await discovery.run();

    logger.info('\nDiscovery Results:');
    logger.info(`  Total places found: ${summary.totalFound}`);
    logger.info(`  Without websites: ${summary.withoutWebsite}`);
    logger.info(`  Newly saved: ${summary.newlySaved}`);
    logger.info(`  Already existed: ${summary.alreadyExists}`);

    return { success: true, data: summary };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Discovery failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Step 2: Generation
 * Generate premium websites for discovered businesses
 */
async function runGeneration(
  config: PipelineConfig
): Promise<StepResult<GenerationSummary>> {
  logger.info('\n' + '='.repeat(60));
  logger.info('[STEP 2/3] GENERATION');
  logger.info('='.repeat(60));

  // Get businesses that need website generation
  const businessesNeedingWebsites = db.getBusinessesNeedingWebsites(config.limit);

  if (businessesNeedingWebsites.length === 0) {
    logger.info('No businesses need website generation.');
    logger.info('  Run discovery first or check business statuses.');
    return {
      success: true,
      data: {
        totalBusinesses: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        totalWebsitesCreated: 0,
        results: [],
      },
    };
  }

  logger.info(`Found ${businessesNeedingWebsites.length} business(es) needing websites:`);
  for (const biz of businessesNeedingWebsites.slice(0, 5)) {
    logger.info(`  - ${biz.name} (${biz.city}, ${biz.state})`);
  }
  if (businessesNeedingWebsites.length > 5) {
    logger.info(`  ... and ${businessesNeedingWebsites.length - 5} more`);
  }

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would generate websites for ${businessesNeedingWebsites.length} businesses`);
    return { success: true };
  }

  try {
    const generator = new GeneratorService({
      templatesPerBusiness: 1, // Generate 1 template per business for speed
      includeFeatures: ['contact_form', 'about_section', 'services_list', 'call_to_action', 'hours_of_operation'],
    });

    const summary = await generator.generateForBusinesses(businessesNeedingWebsites);

    logger.info('\nGeneration Results:');
    logger.info(`  Businesses processed: ${summary.totalBusinesses}`);
    logger.info(`  Successful: ${summary.successfulGenerations}`);
    logger.info(`  Failed: ${summary.failedGenerations}`);
    logger.info(`  Total websites created: ${summary.totalWebsitesCreated}`);

    return { success: true, data: summary };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Generation failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Step 3: Deployment
 * Deploy generated websites to Vercel
 */
async function runDeployment(
  config: PipelineConfig
): Promise<StepResult<BatchDeploymentResult>> {
  logger.info('\n' + '='.repeat(60));
  logger.info('[STEP 3/3] DEPLOYMENT');
  logger.info('='.repeat(60));

  // Get websites pending deployment
  const pendingWebsites = db.getWebsitesPendingDeployment(config.limit);

  if (pendingWebsites.length === 0) {
    logger.info('No websites pending deployment.');
    logger.info('  Run generation first to create websites.');
    return {
      success: true,
      data: {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      },
    };
  }

  logger.info(`Found ${pendingWebsites.length} website(s) pending deployment:`);
  for (const website of pendingWebsites.slice(0, 5)) {
    const business = db.getBusinessById(website.business_id);
    logger.info(`  - ${business?.name ?? 'Unknown'} (${website.template_name})`);
  }
  if (pendingWebsites.length > 5) {
    logger.info(`  ... and ${pendingWebsites.length - 5} more`);
  }

  if (config.dryRun) {
    logger.info(`[DRY RUN] Would deploy ${pendingWebsites.length} websites`);
    return { success: true };
  }

  try {
    const deployment = new DeploymentService();
    const summary = await deployment.deployPending(config.limit);

    logger.info('\nDeployment Results:');
    logger.info(`  Total: ${summary.total}`);
    logger.info(`  Successful: ${summary.successful}`);
    logger.info(`  Failed: ${summary.failed}`);

    return { success: true, data: summary };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Deployment failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// ==================== REPORT GENERATION ====================

/**
 * Generate and save a summary report
 */
function generateReport(config: PipelineConfig, results: PipelineResults): string {
  const endTime = results.endTime ?? new Date();
  const duration = Math.round((endTime.getTime() - results.startTime.getTime()) / 1000);

  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              LOCAL BIZ AGENT - PIPELINE REPORT               ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
    `Run Date: ${results.startTime.toISOString()}`,
    `Duration: ${duration} seconds`,
    `Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`,
    '',
  ];

  // Database Status
  const stats = db.getStats();
  lines.push('┌─────────────────────────────────────────────────────────────┐');
  lines.push('│ DATABASE STATUS                                             │');
  lines.push('├─────────────────────────────────────────────────────────────┤');
  lines.push(`│ Total Businesses:    ${String(stats.totalBusinesses).padStart(6)}                              │`);
  lines.push('│                                                             │');
  lines.push('│ By Status:                                                  │');
  lines.push(`│   • Discovered:       ${String(stats.byStatus.discovered).padStart(5)}                              │`);
  lines.push(`│   • Enriched:         ${String(stats.byStatus.enriched).padStart(5)}                              │`);
  lines.push(`│   • Website Generated:${String(stats.byStatus.website_generated).padStart(5)}                              │`);
  lines.push(`│   • Deployed:         ${String(stats.byStatus.deployed).padStart(5)}                              │`);
  lines.push(`│   • Contacted:        ${String(stats.byStatus.contacted).padStart(5)}                              │`);
  lines.push(`│   • Sold:             ${String(stats.byStatus.sold).padStart(5)}                              │`);
  lines.push('│                                                             │');
  lines.push(`│ Total Websites:      ${String(stats.totalWebsites).padStart(6)}                              │`);
  lines.push('└─────────────────────────────────────────────────────────────┘');
  lines.push('');

  // Discovery Results
  if (results.discovery) {
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│ DISCOVERY RESULTS                                           │');
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│ Total Found:         ${String(results.discovery.totalFound).padStart(6)}                              │`);
    lines.push(`│ Without Websites:    ${String(results.discovery.withoutWebsite).padStart(6)}                              │`);
    lines.push(`│ Newly Saved:         ${String(results.discovery.newlySaved).padStart(6)}                              │`);
    lines.push(`│ Already Existed:     ${String(results.discovery.alreadyExists).padStart(6)}                              │`);
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');
  }

  // Generation Results
  if (results.generation) {
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│ GENERATION RESULTS                                          │');
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│ Businesses Processed:${String(results.generation.totalBusinesses).padStart(6)}                              │`);
    lines.push(`│ Successful:          ${String(results.generation.successfulGenerations).padStart(6)}                              │`);
    lines.push(`│ Failed:              ${String(results.generation.failedGenerations).padStart(6)}                              │`);
    lines.push(`│ Websites Created:    ${String(results.generation.totalWebsitesCreated).padStart(6)}                              │`);
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');
  }

  // Deployment Results
  if (results.deployment) {
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│ DEPLOYMENT RESULTS                                          │');
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│ Total Deployed:      ${String(results.deployment.total).padStart(6)}                              │`);
    lines.push(`│ Successful:          ${String(results.deployment.successful).padStart(6)}                              │`);
    lines.push(`│ Failed:              ${String(results.deployment.failed).padStart(6)}                              │`);
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');

    // List deployed URLs
    const successfulDeploys = results.deployment.results.filter(r => r.result.success);
    if (successfulDeploys.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────┐');
      lines.push('│ DEPLOYED WEBSITES                                           │');
      lines.push('├─────────────────────────────────────────────────────────────┤');
      for (const deploy of successfulDeploys) {
        const bizName = deploy.businessName.slice(0, 25).padEnd(25);
        lines.push(`│ ${bizName}                                    │`);
        lines.push(`│   ${deploy.result.url.slice(0, 55).padEnd(55)}   │`);
      }
      lines.push('└─────────────────────────────────────────────────────────────┘');
      lines.push('');
    }
  }

  // Errors
  if (results.errors.length > 0) {
    lines.push('┌─────────────────────────────────────────────────────────────┐');
    lines.push('│ ERRORS                                                      │');
    lines.push('├─────────────────────────────────────────────────────────────┤');
    for (const error of results.errors) {
      lines.push(`│ • ${error.slice(0, 57).padEnd(57)} │`);
    }
    lines.push('└─────────────────────────────────────────────────────────────┘');
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

/**
 * Save report to file
 */
function saveReport(report: string): string {
  const outputDir = './output';
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `pipeline-report-${date}.txt`;
  const filepath = join(outputDir, filename);

  writeFileSync(filepath, report);
  return filepath;
}

// ==================== MAIN ====================

function parseArgs(): PipelineConfig {
  const args = process.argv.slice(2);

  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '5', 10) : 5;

  return {
    limit,
    discoverOnly: args.includes('--discover-only'),
    generateOnly: args.includes('--generate-only'),
    deployOnly: args.includes('--deploy-only'),
    dryRun: args.includes('--dry-run'),
  };
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    LOCAL BIZ AGENT                           ║');
  console.log('║              Full Pipeline Orchestrator                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  logger.info(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`);
  logger.info(`Limit: ${config.limit} businesses per step`);

  if (config.discoverOnly) logger.info('Running: Discovery only');
  else if (config.generateOnly) logger.info('Running: Generation only');
  else if (config.deployOnly) logger.info('Running: Deployment only');
  else logger.info('Running: Full pipeline (Discovery → Generation → Deployment)');

  const results: PipelineResults = {
    errors: [],
    startTime: new Date(),
  };

  // Initialize database
  db.initialize();

  try {
    // Step 1: Discovery
    if (!config.generateOnly && !config.deployOnly) {
      const discoveryResult = await runDiscovery(config);
      if (!discoveryResult.success) {
        results.errors.push(`Discovery: ${discoveryResult.error}`);
      } else {
        results.discovery = discoveryResult.data;
      }
    }

    // Step 2: Generation
    if (!config.discoverOnly && !config.deployOnly) {
      const generationResult = await runGeneration(config);
      if (!generationResult.success) {
        results.errors.push(`Generation: ${generationResult.error}`);
      } else {
        results.generation = generationResult.data;
      }
    }

    // Step 3: Deployment
    if (!config.discoverOnly && !config.generateOnly) {
      const deploymentResult = await runDeployment(config);
      if (!deploymentResult.success) {
        results.errors.push(`Deployment: ${deploymentResult.error}`);
      } else {
        results.deployment = deploymentResult.data;
      }
    }

    // Generate report
    results.endTime = new Date();
    const report = generateReport(config, results);

    // Print report to console
    console.log('\n');
    console.log(report);

    // Save report to file
    if (!config.dryRun) {
      const reportPath = saveReport(report);
      logger.info(`Report saved to: ${reportPath}`);
    }

    // Exit with error code if there were failures
    if (results.errors.length > 0) {
      logger.warn(`Pipeline completed with ${results.errors.length} error(s)`);
      process.exit(1);
    }

    logger.info('Pipeline completed successfully!');
  } catch (error) {
    logger.error('Pipeline failed with unexpected error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
