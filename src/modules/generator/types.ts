// Generator Module Types
// Types and interfaces for AI-powered website generation

/**
 * Website template styles for generation.
 * Each style produces a distinct visual design using Tailwind CSS.
 */
export enum WebsiteTemplate {
  /** Dark backgrounds with gold/amber accents, dramatic lighting, Playfair Display headings */
  SUSPENDED_DARK = 'suspended_dark',

  /** Clean white/cream, sophisticated typography, subtle shadows, airy feel */
  SUSPENDED_LIGHT = 'suspended_light',

  /** High contrast, vibrant accent colors, large typography, geometric elements */
  SUSPENDED_BOLD = 'suspended_bold',
}

/**
 * Human-readable labels for templates
 */
export const TEMPLATE_LABELS: Record<WebsiteTemplate, string> = {
  [WebsiteTemplate.SUSPENDED_DARK]: 'Suspended Dark',
  [WebsiteTemplate.SUSPENDED_LIGHT]: 'Suspended Light',
  [WebsiteTemplate.SUSPENDED_BOLD]: 'Suspended Bold',
};

/**
 * Template descriptions for the AI prompt
 */
export const TEMPLATE_DESCRIPTIONS: Record<WebsiteTemplate, string> = {
  [WebsiteTemplate.SUSPENDED_DARK]: `
    - Dark backgrounds (#0a0a0a, #1a1a1a) with gold/amber accents (#d4a853, #c9a227)
    - Dramatic lighting effects with subtle gradients and glows
    - Playfair Display for headings, Inter for body text
    - Rich shadows, glass-morphism cards with backdrop-blur
    - Premium, luxury feel — think high-end barbershop or upscale restaurant
    - Gold borders, warm amber hover states, subtle grain texture overlays
  `,
  [WebsiteTemplate.SUSPENDED_LIGHT]: `
    - Clean white (#ffffff) and warm cream (#faf8f5) backgrounds
    - Sophisticated dark typography (#1a1a1a) with muted accent colors
    - Elegant serif/sans-serif pairing (Cormorant Garamond + Inter)
    - Subtle shadows, fine borders, airy spacing
    - Minimalist luxury — think boutique salon or artisan cafe
    - Soft hover transitions, delicate underline animations
  `,
  [WebsiteTemplate.SUSPENDED_BOLD]: `
    - High-contrast design with deep navy (#0f172a) and vibrant accents (#f97316, #06b6d4)
    - Large, impactful typography with Outfit or Space Grotesk headings
    - Geometric background patterns, bold color blocks
    - Strong shadows, chunky borders, energetic feel
    - Modern and confident — think auto shop or fitness studio
    - Animated gradient buttons, bold hover states with scale transforms
  `,
};

/**
 * Industry categories for template content
 */
export type IndustryCategory = 'barber_shop' | 'restaurant' | 'auto_repair' | 'salon' | 'general';

/**
 * Industry-specific prompt data for generating rich, authentic content
 */
export interface IndustryPromptData {
  heroHeadline: string;
  heroSubtext: string;
  services: Array<{
    name: string;
    price: string;
    description: string;
    icon: string;
  }>;
  testimonials: Array<{
    text: string;
    author: string;
    rating: number;
  }>;
  aboutText: string;
  ctaText: string;
  colorPalette: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  fontPairings: {
    heading: string;
    body: string;
    googleFontsUrl: string;
  };
}

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
 * AI provider to use for website generation
 */
export type AIProvider = 'claude' | 'gemini';

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

  /** Which AI provider to use for generation (default: claude) */
  provider?: AIProvider;
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
