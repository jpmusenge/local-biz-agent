// Claude API Client for Website Generation
// Wraps the Anthropic SDK to generate websites using Claude

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { WebsiteTemplate, BusinessInfo, TEMPLATE_LABELS } from './types.js';
import { buildWebsitePrompt } from './templates/base-prompt.js';
import { getIndustryData } from './templates/industry/index.js';
import { checkWebsiteQuality } from './templates/restaurant-premium.js';

/**
 * ClaudeClient - Wrapper for the Anthropic Claude API
 *
 * This client handles website generation using Claude. It:
 * 1. Builds detailed prompts for website generation
 * 2. Calls the Claude API to generate HTML
 * 3. Validates and cleans up the response
 *
 * MOCK MODE:
 * When ANTHROPIC_API_KEY is not set, the client operates in mock mode.
 * This returns premium Tailwind-based HTML websites for testing without API costs.
 */
export class ClaudeClient {
  private client: Anthropic | null = null;
  private apiKey: string | null;
  private isMockMode: boolean;

  // Model to use for generation
  private static readonly MODEL = 'claude-sonnet-4-6';

  // Max tokens for website generation — full HTML sites can exceed 8k tokens
  private static readonly MAX_TOKENS = 16000;

  constructor() {
    this.apiKey = config.get('ANTHROPIC_API_KEY') ?? null;
    this.isMockMode = !this.apiKey;

    if (this.isMockMode) {
      logger.warn('ANTHROPIC_API_KEY not set - running in MOCK MODE');
      logger.warn('Mock mode returns premium Tailwind templates for testing. Set API key for AI-generated websites.');
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Check if running in mock mode
   */
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Generate a website for a business using Claude.
   *
   * @param business - Business information
   * @param template - Visual style template to use
   * @returns Complete HTML string for the website
   */
  async generateWebsite(business: BusinessInfo, template: WebsiteTemplate): Promise<string> {
    const templateLabel = TEMPLATE_LABELS[template];
    logger.info(`Generating ${templateLabel} website for "${business.name}"...`);

    if (this.isMockMode) {
      return this.generateMockWebsite(business, template);
    }

    try {
      const prompt = buildWebsitePrompt(business, template);

      const response = await this.client!.messages.create({
        model: ClaudeClient.MODEL,
        max_tokens: ClaudeClient.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract the text content from the response
      const content = response.content[0];
      if (content?.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
      }

      const html = this.cleanHtmlResponse(content.text);
      logger.info(`Successfully generated ${templateLabel} website (${html.length} chars)`);

      // Run quality check and log results
      const quality = checkWebsiteQuality(html);
      if (!quality.passed) {
        logger.warn(`Quality check FAILED for "${business.name}" (${quality.issues.length} issue(s)):`);
        for (const issue of quality.issues) {
          logger.warn(`  ✗ ${issue}`);
        }
      }
      if (quality.warnings.length > 0) {
        for (const warning of quality.warnings) {
          logger.warn(`  ⚠ ${warning}`);
        }
      }
      if (quality.passed && quality.warnings.length === 0) {
        logger.info(`Quality check PASSED for "${business.name}"`);
      }

      return html;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        logger.error(`Claude API error: ${error.status} - ${error.message}`);
        if (error.status === 401) {
          logger.error('API key may be invalid');
        } else if (error.status === 429) {
          logger.error('Rate limited - please wait before retrying');
        }
      } else {
        logger.error('Error generating website:', error);
      }
      throw error;
    }
  }

  /**
   * Clean up the HTML response from Claude.
   * Removes any markdown code fences or extra text.
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

  /**
   * Generate a premium mock website using Tailwind CSS, Lucide icons, and Google Fonts.
   * Returns an Awwwards-quality HTML website for testing.
   */
  private generateMockWebsite(business: BusinessInfo, template: WebsiteTemplate): Promise<string> {
    logger.info(`[MOCK] Generating premium ${TEMPLATE_LABELS[template]} website for "${business.name}"`);

    const industry = getIndustryData(business.businessType || business.category);
    const colors = this.getTemplateColors(template, industry.colorPalette);
    const fonts = industry.fontPairings;
    const phone = business.phone || '(555) 123-4567';
    const phoneRaw = business.phone?.replace(/\D/g, '') || '5551234567';
    const email = business.email || 'info@example.com';
    const address = business.address || `${business.city}, ${business.state}`;
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="en" style="scroll-behavior: smooth;">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${business.name} - Premium ${business.businessType || business.category} in ${business.city}, ${business.state}">
    <title>${business.name} | ${business.city}, ${business.state}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fonts.googleFontsUrl}" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: '${colors.primary}',
              'primary-light': '${colors.primaryLight}',
              accent: '${colors.accent}',
              surface: '${colors.surface}',
              dark: '${colors.bg}',
            },
            fontFamily: {
              heading: ['${fonts.heading}', 'serif'],
              body: ['${fonts.body}', 'sans-serif'],
            },
          },
        },
      }
    </script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.8s ease forwards;
      }
      .animate-fade-in {
        animation: fadeIn 0.6s ease forwards;
      }
      .animate-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s ease, transform 0.8s ease;
      }
      .animate-on-scroll.visible {
        opacity: 1;
        transform: translateY(0);
      }
    </style>
</head>
<body class="font-body ${colors.bodyClass}">

    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 ${colors.headerBg} backdrop-blur-md border-b ${colors.borderColor}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16 sm:h-20">
          <a href="#" class="font-heading text-xl sm:text-2xl font-bold ${colors.logoColor}">
            ${business.name}
          </a>
          <!-- Desktop Nav -->
          <nav class="hidden md:flex items-center gap-8">
            <a href="#about" class="${colors.navLink} hover:${colors.navLinkHover} transition-colors duration-300 text-sm uppercase tracking-wider font-medium">About</a>
            <a href="#services" class="${colors.navLink} hover:${colors.navLinkHover} transition-colors duration-300 text-sm uppercase tracking-wider font-medium">Services</a>
            <a href="#testimonials" class="${colors.navLink} hover:${colors.navLinkHover} transition-colors duration-300 text-sm uppercase tracking-wider font-medium">Reviews</a>
            <a href="#contact" class="${colors.navLink} hover:${colors.navLinkHover} transition-colors duration-300 text-sm uppercase tracking-wider font-medium">Contact</a>
            <a href="tel:${phoneRaw}" class="bg-primary text-${colors.btnText} px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              ${industry.ctaText}
            </a>
          </nav>
          <!-- Mobile Menu Button -->
          <button id="menu-btn" class="md:hidden ${colors.navLink}" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
        </div>
        <!-- Mobile Nav -->
        <div id="mobile-menu" class="hidden md:hidden pb-6 border-t ${colors.borderColor} mt-2 pt-4">
          <div class="flex flex-col gap-4">
            <a href="#about" class="${colors.navLink} text-sm uppercase tracking-wider font-medium" onclick="document.getElementById('mobile-menu').classList.add('hidden')">About</a>
            <a href="#services" class="${colors.navLink} text-sm uppercase tracking-wider font-medium" onclick="document.getElementById('mobile-menu').classList.add('hidden')">Services</a>
            <a href="#testimonials" class="${colors.navLink} text-sm uppercase tracking-wider font-medium" onclick="document.getElementById('mobile-menu').classList.add('hidden')">Reviews</a>
            <a href="#contact" class="${colors.navLink} text-sm uppercase tracking-wider font-medium" onclick="document.getElementById('mobile-menu').classList.add('hidden')">Contact</a>
            <a href="tel:${phoneRaw}" class="bg-primary text-${colors.btnText} px-5 py-3 rounded-lg text-sm font-semibold text-center hover:bg-accent transition-colors duration-300">
              ${industry.ctaText}
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center ${colors.heroBg} overflow-hidden">
      <div class="absolute inset-0 ${colors.heroOverlay}"></div>
      <div class="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <p class="animate-fade-in text-primary font-medium tracking-[0.2em] uppercase text-sm mb-6">${business.city}, ${business.state}</p>
        <h1 class="animate-fade-in-up font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold ${colors.heroHeading} leading-tight mb-6">
          ${industry.heroHeadline}
        </h1>
        <p class="animate-fade-in-up ${colors.heroSubtext} text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style="animation-delay: 0.2s;">
          ${industry.heroSubtext}
        </p>
        <div class="animate-fade-in-up flex flex-col sm:flex-row gap-4 justify-center" style="animation-delay: 0.4s;">
          <a href="tel:${phoneRaw}" class="bg-primary text-${colors.btnText} px-8 py-4 rounded-lg text-lg font-semibold hover:bg-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
            ${industry.ctaText}
          </a>
          <a href="#services" class="${colors.secondaryBtn} px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:-translate-y-1">
            View Services
          </a>
        </div>
      </div>
      <!-- Scroll Indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <i data-lucide="chevron-down" class="w-6 h-6 ${colors.heroSubtext}"></i>
      </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-20 sm:py-28 ${colors.sectionBg}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div class="animate-on-scroll">
            <p class="text-primary font-medium tracking-[0.15em] uppercase text-sm mb-4">Our Story</p>
            <h2 class="font-heading text-3xl sm:text-4xl font-bold ${colors.heading} mb-6">About ${business.name}</h2>
            <p class="${colors.bodyText} text-lg leading-relaxed mb-6">
              ${industry.aboutText}
            </p>
            <p class="${colors.mutedText} leading-relaxed">
              Proudly serving the ${business.city} community. Whether you're a first-time visitor or a long-time regular, we're here to deliver an experience you'll remember.
            </p>
          </div>
          <div class="animate-on-scroll" style="transition-delay: 0.2s;">
            <div class="relative">
              <div class="${colors.aboutImage} aspect-[4/3] rounded-2xl flex items-center justify-center">
                <i data-lucide="scissors" class="w-20 h-20 ${colors.aboutImageIcon}"></i>
              </div>
              <div class="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-2xl -z-10"></div>
              <div class="absolute -top-6 -left-6 w-24 h-24 bg-accent/10 rounded-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-20 sm:py-28 ${colors.sectionAltBg}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 animate-on-scroll">
          <p class="text-primary font-medium tracking-[0.15em] uppercase text-sm mb-4">What We Offer</p>
          <h2 class="font-heading text-3xl sm:text-4xl font-bold ${colors.heading} mb-4">Our Services</h2>
          <p class="${colors.mutedText} max-w-2xl mx-auto text-lg">Premium services delivered with skill and care. Every visit, every time.</p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          ${industry.services.map((s, i) => `
          <div class="animate-on-scroll group ${colors.cardBg} rounded-2xl p-8 ${colors.cardBorder} hover:-translate-y-1 hover:shadow-xl ${colors.cardHoverShadow} transition-all duration-300" style="transition-delay: ${i * 0.1}s;">
            <div class="w-14 h-14 rounded-xl ${colors.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <i data-lucide="${s.icon}" class="w-6 h-6 text-primary"></i>
            </div>
            <div class="flex items-baseline justify-between mb-3">
              <h3 class="font-heading text-xl font-semibold ${colors.heading}">${s.name}</h3>
              <span class="text-primary font-bold text-lg">${s.price}</span>
            </div>
            <p class="${colors.mutedText} leading-relaxed">${s.description}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="py-20 sm:py-28 ${colors.sectionBg}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 animate-on-scroll">
          <p class="text-primary font-medium tracking-[0.15em] uppercase text-sm mb-4">Testimonials</p>
          <h2 class="font-heading text-3xl sm:text-4xl font-bold ${colors.heading} mb-4">What Our Clients Say</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          ${industry.testimonials.map((t, i) => `
          <div class="animate-on-scroll ${colors.cardBg} rounded-2xl p-8 ${colors.cardBorder} relative" style="transition-delay: ${i * 0.15}s;">
            <i data-lucide="quote" class="w-10 h-10 text-primary/30 mb-4"></i>
            <div class="flex gap-1 mb-4">
              ${'<i data-lucide="star" class="w-4 h-4 text-primary fill-primary"></i>'.repeat(t.rating)}
            </div>
            <p class="${colors.bodyText} leading-relaxed mb-6 italic">"${t.text}"</p>
            <p class="font-semibold ${colors.heading}">- ${t.author}</p>
          </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Hours Section -->
    <section class="py-20 sm:py-28 ${colors.sectionAltBg}">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12 animate-on-scroll">
          <p class="text-primary font-medium tracking-[0.15em] uppercase text-sm mb-4">Visit Us</p>
          <h2 class="font-heading text-3xl sm:text-4xl font-bold ${colors.heading} mb-4">Hours of Operation</h2>
        </div>
        <div class="animate-on-scroll ${colors.cardBg} rounded-2xl p-8 sm:p-10 ${colors.cardBorder}">
          <div class="space-y-4">
            ${[
              { day: 'Monday', hours: '9:00 AM - 7:00 PM' },
              { day: 'Tuesday', hours: '9:00 AM - 7:00 PM' },
              { day: 'Wednesday', hours: '9:00 AM - 7:00 PM' },
              { day: 'Thursday', hours: '9:00 AM - 7:00 PM' },
              { day: 'Friday', hours: '9:00 AM - 7:00 PM' },
              { day: 'Saturday', hours: '8:00 AM - 5:00 PM' },
              { day: 'Sunday', hours: 'Closed' },
            ].map(h => `
            <div class="flex justify-between items-center py-3 border-b ${colors.borderColor} last:border-0">
              <span class="font-medium ${colors.heading}">${h.day}</span>
              <span class="${h.hours === 'Closed' ? 'text-red-400' : colors.mutedText}">${h.hours}</span>
            </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 sm:py-28 ${colors.sectionBg}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16 animate-on-scroll">
          <p class="text-primary font-medium tracking-[0.15em] uppercase text-sm mb-4">Get in Touch</p>
          <h2 class="font-heading text-3xl sm:text-4xl font-bold ${colors.heading} mb-4">Contact Us</h2>
          <p class="${colors.mutedText} max-w-2xl mx-auto text-lg">We'd love to hear from you. Reach out today.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-12 lg:gap-16">
          <!-- Contact Info -->
          <div class="animate-on-scroll space-y-8">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0">
                <i data-lucide="phone" class="w-5 h-5 text-primary"></i>
              </div>
              <div>
                <h3 class="font-semibold ${colors.heading} mb-1">Phone</h3>
                <a href="tel:${phoneRaw}" class="${colors.mutedText} hover:text-primary transition-colors text-lg">${phone}</a>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0">
                <i data-lucide="mail" class="w-5 h-5 text-primary"></i>
              </div>
              <div>
                <h3 class="font-semibold ${colors.heading} mb-1">Email</h3>
                <a href="mailto:${email}" class="${colors.mutedText} hover:text-primary transition-colors text-lg">${email}</a>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0">
                <i data-lucide="map-pin" class="w-5 h-5 text-primary"></i>
              </div>
              <div>
                <h3 class="font-semibold ${colors.heading} mb-1">Address</h3>
                <p class="${colors.mutedText} text-lg">${address}</p>
              </div>
            </div>
            <!-- Map Placeholder -->
            <div class="${colors.mapPlaceholder} rounded-2xl h-48 flex items-center justify-center">
              <div class="text-center ${colors.mutedText}">
                <i data-lucide="map-pin" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
                <p class="text-sm">Map placeholder</p>
              </div>
            </div>
          </div>
          <!-- Contact Form -->
          <div class="animate-on-scroll" style="transition-delay: 0.2s;">
            <form action="#" method="POST" class="${colors.cardBg} rounded-2xl p-8 ${colors.cardBorder}">
              <div class="space-y-5">
                <div>
                  <label for="name" class="block text-sm font-medium ${colors.heading} mb-2">Your Name</label>
                  <input type="text" id="name" name="name" required
                    class="w-full px-4 py-3 rounded-lg ${colors.inputBg} border ${colors.inputBorder} ${colors.inputText} focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300">
                </div>
                <div>
                  <label for="phone-input" class="block text-sm font-medium ${colors.heading} mb-2">Phone Number</label>
                  <input type="tel" id="phone-input" name="phone"
                    class="w-full px-4 py-3 rounded-lg ${colors.inputBg} border ${colors.inputBorder} ${colors.inputText} focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300">
                </div>
                <div>
                  <label for="email-input" class="block text-sm font-medium ${colors.heading} mb-2">Email Address</label>
                  <input type="email" id="email-input" name="email" required
                    class="w-full px-4 py-3 rounded-lg ${colors.inputBg} border ${colors.inputBorder} ${colors.inputText} focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300">
                </div>
                <div>
                  <label for="message" class="block text-sm font-medium ${colors.heading} mb-2">Message</label>
                  <textarea id="message" name="message" rows="4" required
                    class="w-full px-4 py-3 rounded-lg ${colors.inputBg} border ${colors.inputBorder} ${colors.inputText} focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 resize-none"></textarea>
                </div>
                <button type="submit" class="w-full bg-primary text-${colors.btnText} py-4 rounded-lg font-semibold text-lg hover:bg-accent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 sm:py-28 ${colors.ctaBg} relative overflow-hidden">
      <div class="absolute inset-0 ${colors.ctaOverlay}"></div>
      <div class="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <h2 class="animate-on-scroll font-heading text-3xl sm:text-4xl md:text-5xl font-bold ${colors.ctaHeading} mb-6">
          Ready to Experience the Difference?
        </h2>
        <p class="animate-on-scroll ${colors.ctaText} text-lg sm:text-xl max-w-2xl mx-auto mb-10">
          Join the hundreds of satisfied clients who trust ${business.name}. ${industry.ctaText.replace(/^Book|^Schedule|^Get|^Reserve/, 'Come in and')} see why we're ${business.city}'s favorite.
        </p>
        <div class="animate-on-scroll flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:${phoneRaw}" class="bg-primary text-${colors.btnText} px-10 py-4 rounded-lg text-lg font-semibold hover:bg-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 inline-flex items-center justify-center gap-2">
            <i data-lucide="phone" class="w-5 h-5"></i>
            Call Now: ${phone}
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="${colors.footerBg} border-t ${colors.borderColor}">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div class="lg:col-span-2">
            <a href="#" class="font-heading text-2xl font-bold ${colors.logoColor} mb-4 inline-block">${business.name}</a>
            <p class="${colors.mutedText} leading-relaxed max-w-md">
              Premium ${(business.businessType || business.category).toLowerCase()} services in ${business.city}, ${business.state}. Quality, care, and attention to detail in everything we do.
            </p>
            <div class="flex gap-4 mt-6">
              <a href="#" class="w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center hover:bg-primary/20 transition-colors">
                <i data-lucide="facebook" class="w-4 h-4 text-primary"></i>
              </a>
              <a href="#" class="w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center hover:bg-primary/20 transition-colors">
                <i data-lucide="instagram" class="w-4 h-4 text-primary"></i>
              </a>
              <a href="#" class="w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center hover:bg-primary/20 transition-colors">
                <i data-lucide="twitter" class="w-4 h-4 text-primary"></i>
              </a>
            </div>
          </div>
          <div>
            <h4 class="font-heading font-semibold ${colors.heading} mb-4">Quick Links</h4>
            <ul class="space-y-3">
              <li><a href="#about" class="${colors.mutedText} hover:text-primary transition-colors">About</a></li>
              <li><a href="#services" class="${colors.mutedText} hover:text-primary transition-colors">Services</a></li>
              <li><a href="#testimonials" class="${colors.mutedText} hover:text-primary transition-colors">Reviews</a></li>
              <li><a href="#contact" class="${colors.mutedText} hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-heading font-semibold ${colors.heading} mb-4">Contact</h4>
            <ul class="space-y-3">
              <li><a href="tel:${phoneRaw}" class="${colors.mutedText} hover:text-primary transition-colors">${phone}</a></li>
              <li><a href="mailto:${email}" class="${colors.mutedText} hover:text-primary transition-colors">${email}</a></li>
              <li><span class="${colors.mutedText}">${address}</span></li>
            </ul>
          </div>
        </div>
        <div class="border-t ${colors.borderColor} mt-12 pt-8 text-center">
          <p class="${colors.mutedText} text-sm">&copy; ${year} ${business.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>

    <!-- Scripts -->
    <script>
      // Initialize Lucide icons
      lucide.createIcons();

      // Intersection Observer for scroll animations
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

      // Sticky header background on scroll
      const header = document.querySelector('header');
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          header.classList.add('shadow-lg');
        } else {
          header.classList.remove('shadow-lg');
        }
      });
    </script>
</body>
</html>`;

    return Promise.resolve(html);
  }

  /**
   * Get color classes based on template style.
   * Returns Tailwind class strings for each template variation.
   */
  private getTemplateColors(
    template: WebsiteTemplate,
    palette: { primary: string; accent: string; background: string; surface: string; text: string; textMuted: string }
  ): Record<string, string> {
    const base = {
      primary: palette.primary,
      accent: palette.accent,
      surface: palette.surface,
    };

    if (template === WebsiteTemplate.SUSPENDED_DARK) {
      return {
        ...base,
        primaryLight: palette.accent,
        bg: palette.background,
        bodyClass: 'bg-[#0a0a0a] text-gray-100',
        headerBg: 'bg-[#0a0a0a]/90',
        borderColor: 'border-white/10',
        logoColor: 'text-primary',
        navLink: 'text-gray-300',
        navLinkHover: 'text-primary',
        btnText: 'black',
        heroBg: 'bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]',
        heroOverlay: 'bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50',
        heroHeading: 'text-white',
        heroSubtext: 'text-gray-400',
        secondaryBtn: 'border border-white/20 text-white hover:bg-white/10',
        sectionBg: 'bg-[#0a0a0a]',
        sectionAltBg: 'bg-[#111111]',
        heading: 'text-white',
        bodyText: 'text-gray-300',
        mutedText: 'text-gray-500',
        cardBg: 'bg-[#1a1a1a]',
        cardBorder: 'border border-white/5',
        cardHoverShadow: 'hover:shadow-primary/5',
        iconBg: 'bg-primary/10',
        aboutImage: 'bg-gradient-to-br from-primary/20 to-accent/10',
        aboutImageIcon: 'text-primary/50',
        inputBg: 'bg-[#111111]',
        inputBorder: 'border-white/10',
        inputText: 'text-white placeholder:text-gray-600',
        mapPlaceholder: 'bg-[#1a1a1a] border border-white/5',
        ctaBg: 'bg-gradient-to-br from-primary/10 via-[#0a0a0a] to-accent/10',
        ctaOverlay: '',
        ctaHeading: 'text-white',
        ctaText: 'text-gray-400',
        footerBg: 'bg-[#050505]',
      };
    }

    if (template === WebsiteTemplate.SUSPENDED_LIGHT) {
      return {
        ...base,
        primaryLight: palette.accent,
        bg: palette.background,
        bodyClass: 'bg-[#faf8f5] text-gray-900',
        headerBg: 'bg-white/90',
        borderColor: 'border-gray-200',
        logoColor: 'text-gray-900',
        navLink: 'text-gray-600',
        navLinkHover: 'text-gray-900',
        btnText: 'white',
        heroBg: 'bg-gradient-to-br from-[#faf8f5] via-white to-[#f5f0eb]',
        heroOverlay: '',
        heroHeading: 'text-gray-900',
        heroSubtext: 'text-gray-500',
        secondaryBtn: 'border border-gray-300 text-gray-700 hover:bg-gray-100',
        sectionBg: 'bg-white',
        sectionAltBg: 'bg-[#faf8f5]',
        heading: 'text-gray-900',
        bodyText: 'text-gray-700',
        mutedText: 'text-gray-500',
        cardBg: 'bg-white',
        cardBorder: 'border border-gray-100',
        cardHoverShadow: 'hover:shadow-gray-200/50',
        iconBg: 'bg-primary/10',
        aboutImage: 'bg-gradient-to-br from-gray-100 to-gray-200',
        aboutImageIcon: 'text-gray-400',
        inputBg: 'bg-gray-50',
        inputBorder: 'border-gray-200',
        inputText: 'text-gray-900 placeholder:text-gray-400',
        mapPlaceholder: 'bg-gray-100 border border-gray-200',
        ctaBg: 'bg-gray-900',
        ctaOverlay: '',
        ctaHeading: 'text-white',
        ctaText: 'text-gray-400',
        footerBg: 'bg-gray-50',
      };
    }

    // SUSPENDED_BOLD
    return {
      ...base,
      primaryLight: palette.accent,
      bg: palette.background,
      bodyClass: 'bg-[#0f172a] text-gray-100',
      headerBg: 'bg-[#0f172a]/90',
      borderColor: 'border-white/10',
      logoColor: 'text-white',
      navLink: 'text-gray-300',
      navLinkHover: 'text-primary',
      btnText: 'white',
      heroBg: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]',
      heroOverlay: 'bg-gradient-to-t from-[#0f172a] via-transparent to-[#0f172a]/50',
      heroHeading: 'text-white',
      heroSubtext: 'text-gray-400',
      secondaryBtn: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
      sectionBg: 'bg-[#0f172a]',
      sectionAltBg: 'bg-[#1e293b]',
      heading: 'text-white',
      bodyText: 'text-gray-300',
      mutedText: 'text-gray-500',
      cardBg: 'bg-[#1e293b]',
      cardBorder: 'border border-white/5',
      cardHoverShadow: 'hover:shadow-primary/10',
      iconBg: 'bg-primary/10',
      aboutImage: 'bg-gradient-to-br from-primary/20 to-accent/20',
      aboutImageIcon: 'text-primary/50',
      inputBg: 'bg-[#0f172a]',
      inputBorder: 'border-white/10',
      inputText: 'text-white placeholder:text-gray-600',
      mapPlaceholder: 'bg-[#1e293b] border border-white/5',
      ctaBg: 'bg-gradient-to-r from-primary to-accent',
      ctaOverlay: '',
      ctaHeading: 'text-white',
      ctaText: 'text-white/80',
      footerBg: 'bg-[#0a0f1e]',
    };
  }
}

// Export singleton instance
export const claudeClient = new ClaudeClient();
