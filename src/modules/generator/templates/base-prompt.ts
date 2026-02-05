// Base Prompt Builder for Claude Website Generation
// Constructs detailed prompts that guide Claude to create professional websites

import {
  WebsiteTemplate,
  TEMPLATE_DESCRIPTIONS,
  BusinessInfo,
  GeneratorFeature,
  DEFAULT_FEATURES,
} from '../types.js';

/**
 * Build a comprehensive prompt for Claude to generate a website.
 *
 * The prompt instructs Claude to create a complete, single-file HTML website
 * with embedded CSS that is mobile-responsive, modern, and professional.
 *
 * @param business - Business information to include in the website
 * @param template - The visual style template to use
 * @param features - Optional features to include (defaults to DEFAULT_FEATURES)
 * @returns A detailed prompt string for Claude
 */
export function buildWebsitePrompt(
  business: BusinessInfo,
  template: WebsiteTemplate,
  features: GeneratorFeature[] = DEFAULT_FEATURES
): string {
  const templateDescription = TEMPLATE_DESCRIPTIONS[template];
  const featureInstructions = buildFeatureInstructions(features, business);
  const businessContext = buildBusinessContext(business);

  return `You are an expert web designer creating a professional website for a local business. Generate a complete, production-ready single-file HTML website with embedded CSS.

## BUSINESS INFORMATION
${businessContext}

## DESIGN STYLE: ${template.toUpperCase().replace('_', ' ')}
${templateDescription}

## REQUIRED SECTIONS
${featureInstructions}

## TECHNICAL REQUIREMENTS

### HTML Structure
- Use semantic HTML5 elements (header, nav, main, section, footer)
- Include proper meta tags for SEO and mobile viewport
- Add descriptive alt text for any image placeholders
- Use proper heading hierarchy (h1 > h2 > h3)

### CSS Requirements
- All CSS must be embedded in a <style> tag in the <head>
- Use CSS custom properties (variables) for colors and fonts
- Implement a mobile-first responsive design
- Include smooth scroll behavior
- Add subtle transitions and hover effects
- Ensure text is readable (proper contrast ratios)
- Use flexbox or grid for layouts

### Mobile Responsiveness
- The site MUST work perfectly on mobile devices
- Use responsive breakpoints (max-width: 768px for tablets, max-width: 480px for phones)
- Navigation should collapse to a hamburger menu on mobile
- Touch-friendly button sizes (min 44px tap targets)
- Readable font sizes on all devices

### Visual Polish
- Use professional, complementary color scheme
- Include subtle shadows for depth (box-shadow)
- Rounded corners on cards and buttons
- Smooth animations (transform, opacity transitions)
- Professional typography with proper line-height and letter-spacing

### Call-to-Action Elements
- Prominent "Call Now" or "Contact Us" buttons
- Phone number should be clickable (tel: link)
- Email should be clickable (mailto: link)
- Sticky header or floating action button for easy contact

## OUTPUT FORMAT

Return ONLY the complete HTML code. Do not include any explanation, markdown code fences, or additional text. The response should start with <!DOCTYPE html> and end with </html>.

The website should look professional enough that the business owner would be proud to use it immediately. It should feel like it was custom-designed for their specific business.

Generate the complete HTML website now:`;
}

/**
 * Build the business context section of the prompt
 */
function buildBusinessContext(business: BusinessInfo): string {
  const lines: string[] = [
    `- Business Name: ${business.name}`,
    `- Type: ${business.businessType || business.category}`,
    `- Location: ${business.city}, ${business.state}`,
  ];

  if (business.address) {
    lines.push(`- Address: ${business.address}`);
  }

  if (business.phone) {
    lines.push(`- Phone: ${business.phone}`);
  }

  if (business.email) {
    lines.push(`- Email: ${business.email}`);
  }

  // Add industry-specific context
  const industryContext = getIndustryContext(business.businessType || business.category);
  if (industryContext) {
    lines.push(`\n### Industry Context\n${industryContext}`);
  }

  return lines.join('\n');
}

/**
 * Build feature-specific instructions
 */
function buildFeatureInstructions(features: GeneratorFeature[], business: BusinessInfo): string {
  const sections: string[] = [];

  // Always include hero section
  sections.push(`
### 1. Hero Section (Above the Fold)
- Large, impactful headline with the business name
- Brief tagline describing what makes this ${business.businessType || 'business'} special
- Primary call-to-action button ("Call Now", "Book Appointment", or "Get Quote")
- Background could use a gradient or placeholder for a hero image
`);

  if (features.includes('about_section')) {
    sections.push(`
### 2. About Section
- Brief story about the business (use placeholder text that sounds authentic)
- Emphasize local roots in ${business.city}, ${business.state}
- Build trust and connection with the community
- Could include years in business, family-owned, etc.
`);
  }

  if (features.includes('services_list')) {
    sections.push(`
### 3. Services Section
- Grid or card layout of services offered
- Generate 4-6 realistic services for a ${business.businessType || business.category}
- Each service should have a name, brief description, and optional icon (use emoji or CSS icons)
- Consider what services customers in ${business.city} would actually need
`);
  }

  if (features.includes('hours_of_operation')) {
    sections.push(`
### 4. Hours of Operation
- Display typical business hours in a clean format
- Use realistic hours for a ${business.businessType || business.category}
- Could be integrated into contact section or separate
`);
  }

  if (features.includes('testimonials')) {
    sections.push(`
### 5. Testimonials Section
- Include 2-3 realistic customer testimonials
- Use first names only (e.g., "- Sarah M.")
- Focus on quality, reliability, and local service
- Star ratings optional
`);
  }

  if (features.includes('contact_form')) {
    sections.push(`
### 6. Contact Section
- Display phone number prominently (clickable on mobile): ${business.phone || '(555) 123-4567'}
- Email link if available: ${business.email || 'Use a placeholder email'}
- Address: ${business.address || business.city + ', ' + business.state}
- Simple contact form with: Name, Phone, Email, Message fields
- Form can use formsubmit.co or just be visual (action="#")
`);
  }

  if (features.includes('call_to_action')) {
    sections.push(`
### 7. Final Call-to-Action
- Strong closing CTA before the footer
- Reinforce the main action (call, visit, book)
- Could include a special offer or urgency element
`);
  }

  sections.push(`
### 8. Footer
- Copyright notice with business name
- Quick links to sections (About, Services, Contact)
- Social media icon placeholders
- Repeat phone number for easy access
`);

  return sections.join('\n');
}

/**
 * Get industry-specific context to help Claude generate relevant content
 */
function getIndustryContext(businessType: string): string {
  const type = businessType.toLowerCase();

  const contexts: Record<string, string> = {
    'barber shops': `
This is a barber shop that likely offers:
- Haircuts (men's, boys', fades, classic cuts)
- Beard trims and shaves
- Hot towel treatments
- Hair styling
Emphasize: skilled barbers, relaxed atmosphere, walk-ins welcome, appointments available
`,
    'restaurants': `
This is a restaurant that likely offers:
- Dine-in and takeout options
- Local/regional cuisine
- Family-friendly atmosphere
Emphasize: quality ingredients, friendly service, local favorite, online ordering
`,
    'auto repair': `
This is an auto repair shop that likely offers:
- Oil changes and maintenance
- Brake repair
- Engine diagnostics
- Tire services
Emphasize: honest pricing, certified mechanics, quick turnaround, all makes/models
`,
    'salons': `
This is a salon that likely offers:
- Haircuts and styling
- Coloring and highlights
- Treatments and conditioning
- Special occasion styling
Emphasize: skilled stylists, relaxing environment, personalized consultations
`,
    'plumber': `
This is a plumbing service that likely offers:
- Emergency repairs (24/7)
- Drain cleaning
- Water heater service
- Fixture installation
Emphasize: fast response, upfront pricing, licensed & insured, satisfaction guaranteed
`,
    'electrician': `
This is an electrical service that likely offers:
- Electrical repairs
- Panel upgrades
- Lighting installation
- Safety inspections
Emphasize: licensed & insured, code compliant, safety first, free estimates
`,
  };

  // Find matching context or return generic
  for (const [key, context] of Object.entries(contexts)) {
    if (type.includes(key) || key.includes(type)) {
      return context;
    }
  }

  return `
This is a local service business. Generate appropriate services and content
that would appeal to customers in the local area. Emphasize quality,
reliability, and community connection.
`;
}

/**
 * Build a simpler prompt for regenerating just one section
 */
export function buildSectionPrompt(
  sectionType: string,
  business: BusinessInfo,
  template: WebsiteTemplate
): string {
  return `Generate only the ${sectionType} section HTML for a ${business.businessType} called "${business.name}" in ${business.city}, ${business.state}.

Use this style: ${TEMPLATE_DESCRIPTIONS[template]}

Return only the HTML for this section, no full page structure.`;
}
