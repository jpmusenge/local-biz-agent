// Generator Module Types
// Types and interfaces for AI-powered website generation

/**
 * Website template styles for generation.
 * Each style produces a distinct visual design.
 */
export enum WebsiteTemplate {
  /** Clean, minimalist design with lots of whitespace */
  MODERN_MINIMAL = 'modern_minimal',

  /** Vibrant colors and dynamic layout */
  BOLD_COLORFUL = 'bold_colorful',

  /** Traditional business look with trust-building elements */
  PROFESSIONAL_CLEAN = 'professional_clean',
}

/**
 * Human-readable labels for templates
 */
export const TEMPLATE_LABELS: Record<WebsiteTemplate, string> = {
  [WebsiteTemplate.MODERN_MINIMAL]: 'Modern Minimal',
  [WebsiteTemplate.BOLD_COLORFUL]: 'Bold & Colorful',
  [WebsiteTemplate.PROFESSIONAL_CLEAN]: 'Professional Clean',
};

/**
 * Template descriptions for the AI prompt
 */
export const TEMPLATE_DESCRIPTIONS: Record<WebsiteTemplate, string> = {
  [WebsiteTemplate.MODERN_MINIMAL]: `
    - Clean, minimalist aesthetic with generous whitespace
    - Neutral color palette (whites, grays, one accent color)
    - Simple sans-serif typography (Inter, Helvetica, or similar)
    - Subtle shadows and rounded corners
    - Focus on content hierarchy and readability
    - Elegant hover effects
  `,
  [WebsiteTemplate.BOLD_COLORFUL]: `
    - Vibrant, eye-catching color scheme (bold primary + complementary accent)
    - Dynamic gradients and color blocks
    - Strong visual hierarchy with large headings
    - Playful but professional feel
    - Engaging call-to-action buttons with animations
    - Modern geometric shapes or patterns as accents
  `,
  [WebsiteTemplate.PROFESSIONAL_CLEAN]: `
    - Traditional business aesthetic that builds trust
    - Conservative color palette (navy, charcoal, or forest green with gold/copper accents)
    - Classic typography that feels established
    - Clean grid layout with clear sections
    - Professional imagery suggestions
    - Testimonial and credibility sections emphasized
  `,
};

/**
 * A generated website with its content and metadata
 */
export interface GeneratedWebsite {
  /** The complete HTML content (single file with embedded CSS) */
  html: string;

  /** Extracted/separate CSS if needed */
  css: string;

  /** Which template style was used */
  templateUsed: WebsiteTemplate;

  /** The business this website was generated for */
  businessId: string;

  /** Variation number (1, 2, 3...) */
  variationNumber: number;
}

/**
 * Configuration for the generator service
 */
export interface GeneratorConfig {
  /** Number of template variations to generate per business (1-3) */
  templatesPerBusiness: number;

  /** Features to include in generated websites */
  includeFeatures: GeneratorFeature[];

  /** Which templates to use (defaults to all) */
  templates?: WebsiteTemplate[];
}

/**
 * Optional features that can be included in generated websites
 */
export type GeneratorFeature =
  | 'contact_form'
  | 'google_maps'
  | 'social_links'
  | 'testimonials'
  | 'gallery'
  | 'hours_of_operation'
  | 'about_section'
  | 'services_list'
  | 'call_to_action';

/**
 * Default features included in all generated websites
 */
export const DEFAULT_FEATURES: GeneratorFeature[] = [
  'contact_form',
  'about_section',
  'services_list',
  'call_to_action',
  'hours_of_operation',
];

/**
 * Business info needed for website generation
 */
export interface BusinessInfo {
  id: string;
  name: string;
  businessType: string;
  category: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  address?: string;
}

/**
 * Result of a generation run for a single business
 */
export interface GenerationResult {
  businessId: string;
  businessName: string;
  success: boolean;
  websitesGenerated: number;
  websiteIds: string[];
  error?: string;
}

/**
 * Summary of a batch generation run
 */
export interface GenerationSummary {
  totalBusinesses: number;
  successfulGenerations: number;
  failedGenerations: number;
  totalWebsitesCreated: number;
  results: GenerationResult[];
}
