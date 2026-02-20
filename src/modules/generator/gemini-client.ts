// Gemini API Client for Website Generation
// Wraps the Google Generative AI SDK to generate websites using Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { WebsiteTemplate, BusinessInfo, TEMPLATE_LABELS } from './types.js';
import { buildWebsitePrompt } from './templates/base-prompt.js';

/**
 * GeminiClient - Wrapper for the Google Gemini API
 *
 * Drop-in alternative to ClaudeClient. Implements the same generateWebsite()
 * interface so it can be swapped in via the --provider=gemini flag.
 *
 * MOCK MODE:
 * When GEMINI_API_KEY is not set, falls back to a notice — no mock generation
 * (use ClaudeClient mock mode for that).
 */
export class GeminiClient {
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null;
  private isMockMode: boolean;
  private model: string;

  // Default model — gemini-2.5-pro for best quality output
  private static readonly DEFAULT_MODEL = 'gemini-2.5-pro';

  constructor(model?: string) {
    this.apiKey = config.get('GEMINI_API_KEY') ?? null;
    this.isMockMode = !this.apiKey;
    this.model = model ?? GeminiClient.DEFAULT_MODEL;

    if (this.isMockMode) {
      logger.warn('GEMINI_API_KEY not set - Gemini client cannot generate websites');
      logger.warn('Add GEMINI_API_KEY to your .env file to use Gemini generation.');
    } else {
      this.client = new GoogleGenerativeAI(this.apiKey!);
      logger.info(`Gemini client initialized (model: ${this.model})`);
    }
  }

  /**
   * Check if running in mock mode (no API key)
   */
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Generate a website for a business using Gemini.
   * Uses the same prompt as ClaudeClient for apples-to-apples comparison.
   *
   * @param business - Business information
   * @param template - Visual style template to use
   * @returns Complete HTML string for the website
   */
  async generateWebsite(business: BusinessInfo, template: WebsiteTemplate): Promise<string> {
    const templateLabel = TEMPLATE_LABELS[template];
    logger.info(`[Gemini] Generating ${templateLabel} website for "${business.name}"...`);

    if (this.isMockMode) {
      throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');
    }

    try {
      const prompt = buildWebsitePrompt(business, template);

      const generativeModel = this.client!.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: 16000,
          temperature: 0.7,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const html = this.cleanHtmlResponse(text);
      logger.info(`[Gemini] Successfully generated ${templateLabel} website (${html.length} chars)`);

      return html;
    } catch (error) {
      logger.error(`[Gemini] Error generating website:`, error);
      throw error;
    }
  }

  /**
   * Clean up the HTML response from Gemini.
   * Removes markdown code fences or extra prose Gemini sometimes prepends.
   */
  private cleanHtmlResponse(response: string): string {
    let html = response.trim();

    // Remove markdown code fences if present
    if (html.startsWith('```html')) {
      html = html.slice(7);
    } else if (html.startsWith('```')) {
      html = html.slice(3);
    }

    if (html.endsWith('```')) {
      html = html.slice(0, -3);
    }

    // Ensure it starts with DOCTYPE
    const doctypeIndex = html.toLowerCase().indexOf('<!doctype html>');
    if (doctypeIndex > 0) {
      html = html.slice(doctypeIndex);
    }

    // Ensure it ends with </html>
    const htmlEndIndex = html.toLowerCase().lastIndexOf('</html>');
    if (htmlEndIndex !== -1) {
      html = html.slice(0, htmlEndIndex + 7);
    }

    return html.trim();
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
