// Generator Module
// AI-powered website generation for local businesses

import { db } from '../../database/index.js';
import type { Business } from '../../database/types.js';
import { logger } from '../../utils/index.js';
import { ClaudeClient, claudeClient } from './claude-client.js';
import { GeminiClient, geminiClient } from './gemini-client.js';
import {
  WebsiteTemplate,
  GeneratorConfig,
  GeneratedWebsite,
  GenerationResult,
  GenerationSummary,
  BusinessInfo,
  DEFAULT_FEATURES,
  TEMPLATE_LABELS,
} from './types.js';

// Re-export types and clients
export * from './types.js';
export { ClaudeClient, claudeClient } from './claude-client.js';
export { GeminiClient, geminiClient } from './gemini-client.js';
export { buildWebsitePrompt } from './templates/base-prompt.js';

/**
 * GeneratorService - Main service for generating websites
 *
 * This service:
 * 1. Takes businesses from the database
 * 2. Generates multiple website variations using Claude
 * 3. Saves generated websites to the database
 * 4. Updates business status
 *
 * Usage:
 * ```typescript
 * const generator = new GeneratorService({
 *   templatesPerBusiness: 2,
 *   includeFeatures: ['contact_form', 'services_list'],
 * });
 *
 * const summary = await generator.generateForBusinesses(businesses);
 * console.log(`Generated ${summary.totalWebsitesCreated} websites`);
 * ```
 */
export class GeneratorService {
  private config: GeneratorConfig;
  private client: ClaudeClient | GeminiClient;

  // Available templates in order of generation
  private static readonly TEMPLATE_ORDER: WebsiteTemplate[] = [
    WebsiteTemplate.SUSPENDED_DARK,
    WebsiteTemplate.SUSPENDED_LIGHT,
    WebsiteTemplate.SUSPENDED_BOLD,
  ];

  constructor(config?: Partial<GeneratorConfig>, client?: ClaudeClient | GeminiClient) {
    this.config = {
      templatesPerBusiness: config?.templatesPerBusiness ?? 2,
      includeFeatures: config?.includeFeatures ?? DEFAULT_FEATURES,
      templates: config?.templates,
      provider: config?.provider ?? 'claude',
    };

    if (client) {
      this.client = client;
    } else if (this.config.provider === 'gemini') {
      this.client = geminiClient;
      logger.info('Using Gemini as AI provider');
    } else {
      this.client = claudeClient;
      logger.info('Using Claude as AI provider');
    }
  }

  /**
   * Generate websites for multiple businesses.
   */
  async generateForBusinesses(businesses: Business[]): Promise<GenerationSummary> {
    logger.info(`Starting website generation for ${businesses.length} businesses...`);

    if (this.client.isInMockMode()) {
      logger.warn('Running in MOCK MODE - websites are sample templates');
    }

    const summary: GenerationSummary = {
      totalBusinesses: businesses.length,
      successfulGenerations: 0,
      failedGenerations: 0,
      totalWebsitesCreated: 0,
      results: [],
    };

    for (const business of businesses) {
      const result = await this.generateForBusiness(business);
      summary.results.push(result);

      if (result.success) {
        summary.successfulGenerations++;
        summary.totalWebsitesCreated += result.websitesGenerated;
      } else {
        summary.failedGenerations++;
      }
    }

    logger.info('\n' + '='.repeat(50));
    logger.info('GENERATION COMPLETE');
    logger.info('='.repeat(50));
    logger.info(`Businesses processed: ${summary.totalBusinesses}`);
    logger.info(`Successful: ${summary.successfulGenerations}`);
    logger.info(`Failed: ${summary.failedGenerations}`);
    logger.info(`Total websites created: ${summary.totalWebsitesCreated}`);

    return summary;
  }

  /**
   * Generate websites for a single business.
   */
  async generateForBusiness(business: Business): Promise<GenerationResult> {
    logger.info(`\nGenerating websites for: ${business.name}`);

    const result: GenerationResult = {
      businessId: business.id,
      businessName: business.name,
      success: false,
      websitesGenerated: 0,
      websiteIds: [],
    };

    try {
      // Convert database business to BusinessInfo
      const businessInfo = this.toBusinessInfo(business);

      // Get templates to use
      const templates = this.getTemplatesToUse();
      logger.info(`  Using ${templates.length} template(s): ${templates.map(t => TEMPLATE_LABELS[t]).join(', ')}`);

      // Generate a website for each template
      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        if (!template) continue;

        const templateLabel = TEMPLATE_LABELS[template];
        logger.info(`  Generating ${templateLabel} (${i + 1}/${templates.length})...`);

        try {
          const html = await this.client.generateWebsite(businessInfo, template);

          // Save to database
          const savedWebsite = db.insertWebsite({
            business_id: business.id,
            template_name: template,
            variation_number: i + 1,
            html_content: html,
          });

          result.websiteIds.push(savedWebsite.id);
          result.websitesGenerated++;
          logger.info(`    Saved website (${html.length} chars)`);
        } catch (error) {
          logger.error(`    Failed to generate ${templateLabel}:`, error);
        }
      }

      if (result.websitesGenerated > 0) {
        result.success = true;
        // Status is updated by db.insertWebsite automatically
        logger.info(`  Successfully generated ${result.websitesGenerated} website(s)`);
      } else {
        result.success = false;
        result.error = 'No websites generated';
        logger.error(`  Failed to generate any websites`);
      }
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      logger.error(`  Error generating websites: ${result.error}`);
    }

    return result;
  }

  /**
   * Generate a single website for a business with a specific template.
   * Does not save to database - returns the generated HTML.
   */
  async generateSingle(
    business: Business,
    template: WebsiteTemplate
  ): Promise<GeneratedWebsite> {
    const businessInfo = this.toBusinessInfo(business);
    const html = await this.client.generateWebsite(businessInfo, template);

    return {
      html,
      css: '', // CSS is embedded in HTML
      templateUsed: template,
      businessId: business.id,
      variationNumber: 1,
    };
  }

  /**
   * Get businesses that need website generation.
   */
  getBusinessesNeedingGeneration(limit = 10): Business[] {
    return db.getBusinessesNeedingWebsites(limit);
  }

  /**
   * Get templates to use based on config.
   */
  private getTemplatesToUse(): WebsiteTemplate[] {
    const available = this.config.templates ?? GeneratorService.TEMPLATE_ORDER;
    return available.slice(0, this.config.templatesPerBusiness);
  }

  /**
   * Convert a database Business to BusinessInfo for the generator.
   */
  private toBusinessInfo(business: Business): BusinessInfo {
    return {
      id: business.id,
      name: business.name,
      businessType: business.business_type ?? '',
      category: business.category ?? business.business_type ?? 'Business',
      city: business.city ?? '',
      state: business.state ?? '',
      phone: business.phone ?? undefined,
      email: business.email ?? undefined,
      address: business.address ?? undefined,
    };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): GeneratorConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to generate websites for businesses.
 */
export async function generateWebsites(
  businesses: Business[],
  config?: Partial<GeneratorConfig>
): Promise<GenerationSummary> {
  const service = new GeneratorService(config);
  return service.generateForBusinesses(businesses);
}

/**
 * Generate websites for all businesses in "discovered" status.
 */
export async function generateForDiscovered(
  limit = 10,
  config?: Partial<GeneratorConfig>
): Promise<GenerationSummary> {
  const service = new GeneratorService(config);
  const businesses = service.getBusinessesNeedingGeneration(limit);

  if (businesses.length === 0) {
    logger.info('No businesses found needing website generation');
    return {
      totalBusinesses: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      totalWebsitesCreated: 0,
      results: [],
    };
  }

  return service.generateForBusinesses(businesses);
}

// Legacy export for backwards compatibility
export const generator = {
  GeneratorService,
  generateWebsites,
  generateForDiscovered,
  claudeClient,
};
