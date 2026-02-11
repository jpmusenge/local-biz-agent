// Base Prompt Builder for Claude Website Generation
// Constructs premium, Awwwards-quality prompts using Tailwind CSS, Lucide icons, and Google Fonts

import {
  WebsiteTemplate,
  TEMPLATE_DESCRIPTIONS,
  BusinessInfo,
  GeneratorFeature,
  DEFAULT_FEATURES,
} from '../types.js';
import { getIndustryData } from './industry/index.js';

/**
 * Build a comprehensive prompt for Claude to generate a premium website.
 *
 * The prompt instructs Claude to create a complete, single-file HTML website
 * using Tailwind CSS CDN, Lucide icons, and Google Fonts for a polished,
 * Awwwards-quality result.
 */
export function buildWebsitePrompt(
  business: BusinessInfo,
  template: WebsiteTemplate,
  features: GeneratorFeature[] = DEFAULT_FEATURES
): string {
  const templateDescription = TEMPLATE_DESCRIPTIONS[template];
  const industryData = getIndustryData(business.businessType || business.category);
  const featureInstructions = buildFeatureInstructions(features, business);
  const businessContext = buildBusinessContext(business);

  return `You are a world-class web designer creating an Awwwards-quality website for a local business. Generate a complete, production-ready single-file HTML website that looks like it was designed by a premium agency.

## TECH STACK (MANDATORY)
You MUST use these CDN resources in the <head>:

\`\`\`html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${industryData.fontPairings.googleFontsUrl}" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
\`\`\`

Include a Tailwind config block:
\`\`\`html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '${industryData.colorPalette.primary}',
          accent: '${industryData.colorPalette.accent}',
          surface: '${industryData.colorPalette.surface}',
        },
        fontFamily: {
          heading: ['${industryData.fontPairings.heading}', 'serif'],
          body: ['${industryData.fontPairings.body}', 'sans-serif'],
        },
      },
    },
  }
</script>
\`\`\`

Initialize Lucide icons at the end of body:
\`\`\`html
<script>lucide.createIcons();</script>
\`\`\`

## BUSINESS INFORMATION
${businessContext}

## DESIGN STYLE: ${template.toUpperCase().replace(/_/g, ' ')}
${templateDescription}

## INDUSTRY CONTENT
Use this specific content for the website:

**Hero:**
- Headline: "${industryData.heroHeadline}"
- Subtext: "${industryData.heroSubtext}"

**Services:**
${industryData.services.map(s => `- ${s.name} (${s.price}) — ${s.description} [Lucide icon: ${s.icon}]`).join('\n')}

**Testimonials:**
${industryData.testimonials.map(t => `- "${t.text}" — ${t.author} (${'★'.repeat(t.rating)})`).join('\n')}

**About:** "${industryData.aboutText}"

**CTA Button Text:** "${industryData.ctaText}"

## REQUIRED SECTIONS
${featureInstructions}

## TECHNICAL REQUIREMENTS

### Tailwind Usage
- Use Tailwind utility classes exclusively — NO custom CSS except for keyframe animations in a <style> tag
- Use responsive prefixes: sm:, md:, lg: for breakpoints
- Use hover:, focus:, group-hover: for interactive states
- Use transition, duration, ease classes for animations
- Use backdrop-blur, bg-opacity for glass-morphism effects

### Lucide Icons
- Use Lucide icon elements: \`<i data-lucide="icon-name" class="w-6 h-6"></i>\`
- Available icons: scissors, pen-tool, flame, crown, minus, smile, star, phone, mail, map-pin, clock, menu, x, chevron-right, quote, facebook, instagram, twitter
- Style icons with Tailwind classes on the <i> element

### Layout & Structure
- Use semantic HTML5 (header, nav, main, section, footer)
- Mobile-first responsive design
- Smooth scroll: add \`scroll-behavior: smooth\` via inline style on <html>
- Sticky header with backdrop-blur effect
- Intersection Observer for scroll-triggered fade-in animations

### Sections to Build
1. **Hero** — Full viewport height, gradient overlay, business name as large heading, subtext, CTA button, subtle scroll indicator
2. **About** — Split layout (text + image placeholder div with gradient), story text
3. **Services** — Animated card grid, each card with Lucide icon, service name, price badge, description, hover lift effect
4. **Testimonials** — Cards with quote icon, star ratings, author name
5. **Hours** — Clean table/grid layout with days and times
6. **Contact** — Two-column: info (phone, email, address with Lucide icons) + styled form (name, phone, email, message, submit button)
7. **CTA Bar** — Bold call-to-action section before footer
8. **Footer** — Multi-column with links, contact info, copyright

### Mobile Menu
- Hamburger icon (Lucide "menu") toggles a slide-down mobile nav
- Close icon (Lucide "x") to dismiss
- Use JavaScript for toggle functionality

### Animations
Add a <style> block with:
- Fade-in-up keyframe animation for scroll-triggered elements
- Use Intersection Observer in a <script> block to add animation classes on scroll

## OUTPUT FORMAT
Return ONLY the complete HTML code. No explanation, no markdown fences. Start with <!DOCTYPE html> and end with </html>.

Generate the complete premium HTML website now:`;
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

  return lines.join('\n');
}

/**
 * Build feature-specific instructions
 */
function buildFeatureInstructions(features: GeneratorFeature[], business: BusinessInfo): string {
  const sections: string[] = [];

  sections.push(`
### Hero Section (Above the Fold)
- Full viewport height with gradient overlay
- Large heading with the business name using font-heading
- Tagline text
- Primary CTA button with hover animation
- Subtle down-arrow scroll indicator
`);

  if (features.includes('about_section')) {
    sections.push(`
### About Section
- Two-column layout (text left, image placeholder right)
- Use the provided about text
- Emphasize local roots in ${business.city}, ${business.state}
`);
  }

  if (features.includes('services_list')) {
    sections.push(`
### Services Section
- Card grid using the provided services data
- Each card: Lucide icon, name, price badge, description
- Hover: translateY(-4px) with shadow increase
- Staggered fade-in animation on scroll
`);
  }

  if (features.includes('hours_of_operation')) {
    sections.push(`
### Hours of Operation
- Clean grid with days and hours
- Highlight today's hours if possible
- Hours: Mon-Fri 9AM-7PM, Sat 8AM-5PM, Sun Closed
`);
  }

  if (features.includes('testimonials')) {
    sections.push(`
### Testimonials Section
- Use the provided testimonials
- Quote icon (Lucide "quote") at top of each card
- Star rating display
- Author name with subtle styling
`);
  }

  if (features.includes('contact_form')) {
    sections.push(`
### Contact Section
- Two-column: contact info left, form right
- Phone: ${business.phone || '(555) 123-4567'} (clickable tel: link)
- Email: ${business.email || 'info@example.com'} (clickable mailto: link)
- Address: ${business.address || business.city + ', ' + business.state}
- Form: name, phone, email, message, submit button (action="#")
- Each contact item has a Lucide icon (phone, mail, map-pin)
`);
  }

  if (features.includes('call_to_action')) {
    sections.push(`
### CTA Section
- Bold background section before footer
- Strong heading and CTA button
- Use the provided CTA text
`);
  }

  sections.push(`
### Footer
- Multi-column: business info, quick links, contact details
- Copyright with current year
- Social media icon placeholders (Lucide: facebook, instagram, twitter)
`);

  return sections.join('\n');
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

Use Tailwind CSS utility classes and this style: ${TEMPLATE_DESCRIPTIONS[template]}

Return only the HTML for this section, no full page structure.`;
}
