// Claude API Client for Website Generation
// Wraps the Anthropic SDK to generate websites using Claude

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { WebsiteTemplate, BusinessInfo, TEMPLATE_LABELS } from './types.js';
import { buildWebsitePrompt } from './templates/base-prompt.js';

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
 * This returns sample HTML websites for testing without API costs.
 */
export class ClaudeClient {
  private client: Anthropic | null = null;
  private apiKey: string | null;
  private isMockMode: boolean;

  // Model to use for generation
  private static readonly MODEL = 'claude-sonnet-4-20250514';

  // Max tokens for website generation (websites can be large)
  private static readonly MAX_TOKENS = 8000;

  constructor() {
    this.apiKey = config.get('ANTHROPIC_API_KEY') ?? null;
    this.isMockMode = !this.apiKey;

    if (this.isMockMode) {
      logger.warn('ANTHROPIC_API_KEY not set - running in MOCK MODE');
      logger.warn('Mock mode returns sample HTML for testing. Set API key for AI-generated websites.');
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
   * Generate a mock website for testing.
   * Returns a complete, professional-looking HTML website.
   */
  private generateMockWebsite(business: BusinessInfo, template: WebsiteTemplate): Promise<string> {
    logger.info(`[MOCK] Generating sample website for "${business.name}"`);

    const colors = this.getTemplateColors(template);
    const services = this.getMockServices(business.businessType || business.category);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${business.name} - Quality ${business.businessType || business.category} services in ${business.city}, ${business.state}">
    <title>${business.name} | ${business.city}, ${business.state}</title>
    <style>
        /* CSS Custom Properties */
        :root {
            --primary: ${colors.primary};
            --primary-dark: ${colors.primaryDark};
            --secondary: ${colors.secondary};
            --accent: ${colors.accent};
            --text: ${colors.text};
            --text-light: ${colors.textLight};
            --bg: ${colors.bg};
            --bg-alt: ${colors.bgAlt};
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --radius: 8px;
            --radius-lg: 16px;
        }

        /* Reset & Base */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
        }

        img {
            max-width: 100%;
            height: auto;
        }

        a {
            color: var(--primary);
            text-decoration: none;
            transition: color 0.3s ease;
        }

        a:hover {
            color: var(--primary-dark);
        }

        /* Typography */
        h1, h2, h3, h4, h5, h6 {
            font-weight: 700;
            line-height: 1.2;
            color: var(--text);
        }

        h1 { font-size: 2.5rem; }
        h2 { font-size: 2rem; margin-bottom: 1rem; }
        h3 { font-size: 1.5rem; }

        p {
            margin-bottom: 1rem;
            color: var(--text-light);
        }

        /* Layout */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        section {
            padding: 5rem 0;
        }

        /* Header */
        header {
            background: var(--bg);
            box-shadow: var(--shadow);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--primary);
        }

        nav ul {
            display: flex;
            list-style: none;
            gap: 2rem;
        }

        nav a {
            color: var(--text);
            font-weight: 500;
            transition: color 0.3s;
        }

        nav a:hover {
            color: var(--primary);
        }

        .nav-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text);
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 10rem 0 6rem;
            text-align: center;
        }

        .hero h1 {
            color: white;
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .hero p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.25rem;
            max-width: 600px;
            margin: 0 auto 2rem;
        }

        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            border-radius: var(--radius);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
        }

        .btn-primary {
            background: var(--accent);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-secondary {
            background: white;
            color: var(--primary);
            margin-left: 1rem;
        }

        .btn-secondary:hover {
            background: var(--bg-alt);
        }

        /* About Section */
        .about {
            background: var(--bg-alt);
        }

        .about-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
        }

        .about-image {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            height: 400px;
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 4rem;
        }

        /* Services Section */
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .service-card {
            background: white;
            padding: 2rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
            transition: transform 0.3s, box-shadow 0.3s;
            text-align: center;
        }

        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-lg);
        }

        .service-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .service-card h3 {
            margin-bottom: 0.5rem;
        }

        /* Testimonials */
        .testimonials {
            background: var(--bg-alt);
        }

        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .testimonial-card {
            background: white;
            padding: 2rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
        }

        .testimonial-text {
            font-style: italic;
            margin-bottom: 1rem;
            color: var(--text);
        }

        .testimonial-author {
            font-weight: 600;
            color: var(--primary);
        }

        .stars {
            color: #fbbf24;
            margin-bottom: 0.5rem;
        }

        /* Contact Section */
        .contact {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
        }

        .contact h2, .contact p {
            color: white;
        }

        .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            margin-top: 3rem;
        }

        .contact-info {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .contact-icon {
            font-size: 1.5rem;
        }

        .contact-item a {
            color: white;
            font-size: 1.1rem;
        }

        .contact-form {
            background: white;
            padding: 2rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text);
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: var(--radius);
            font-size: 1rem;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
        }

        .contact-form .btn {
            width: 100%;
        }

        /* Hours */
        .hours {
            margin-top: 2rem;
        }

        .hours h3 {
            color: white;
            margin-bottom: 1rem;
        }

        .hours-list {
            list-style: none;
        }

        .hours-list li {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* CTA Section */
        .cta {
            text-align: center;
            background: var(--bg-alt);
        }

        .cta h2 {
            margin-bottom: 1rem;
        }

        .cta p {
            max-width: 600px;
            margin: 0 auto 2rem;
        }

        /* Footer */
        footer {
            background: var(--text);
            color: white;
            padding: 3rem 0;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
        }

        .footer-section h4 {
            color: white;
            margin-bottom: 1rem;
        }

        .footer-section ul {
            list-style: none;
        }

        .footer-section li {
            margin-bottom: 0.5rem;
        }

        .footer-section a {
            color: rgba(255, 255, 255, 0.7);
        }

        .footer-section a:hover {
            color: white;
        }

        .footer-bottom {
            text-align: center;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            h2 { font-size: 1.75rem; }

            .nav-toggle {
                display: block;
            }

            nav ul {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                flex-direction: column;
                padding: 1rem;
                gap: 1rem;
                box-shadow: var(--shadow);
            }

            nav ul.active {
                display: flex;
            }

            .hero {
                padding: 8rem 0 4rem;
            }

            .hero h1 {
                font-size: 2.25rem;
            }

            .btn-secondary {
                margin-left: 0;
                margin-top: 1rem;
            }

            .about-content,
            .contact-grid {
                grid-template-columns: 1fr;
                gap: 2rem;
            }

            .about-image {
                height: 250px;
            }

            section {
                padding: 3rem 0;
            }
        }

        @media (max-width: 480px) {
            .container {
                padding: 0 1rem;
            }

            .hero h1 {
                font-size: 1.875rem;
            }

            .services-grid,
            .testimonials-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="container header-content">
            <a href="#" class="logo">${business.name}</a>
            <button class="nav-toggle" onclick="document.querySelector('nav ul').classList.toggle('active')">
                ☰
            </button>
            <nav>
                <ul>
                    <li><a href="#about">About</a></li>
                    <li><a href="#services">Services</a></li>
                    <li><a href="#testimonials">Reviews</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>${business.name}</h1>
            <p>Your trusted ${(business.businessType || business.category).toLowerCase()} in ${business.city}, ${business.state}. Quality service, fair prices, and a commitment to excellence since day one.</p>
            <a href="tel:${business.phone || '5551234567'}" class="btn btn-primary">Call Now: ${business.phone || '(555) 123-4567'}</a>
            <a href="#contact" class="btn btn-secondary">Get in Touch</a>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="about">
        <div class="container about-content">
            <div class="about-text">
                <h2>About ${business.name}</h2>
                <p>Welcome to ${business.name}, where we've been proudly serving the ${business.city} community with exceptional ${(business.businessType || business.category).toLowerCase()} services.</p>
                <p>Our team is dedicated to providing you with the best experience possible. We believe in honest work, fair pricing, and treating every customer like family.</p>
                <p>Whether you're a first-time customer or a longtime friend, we're here to help with all your needs. Stop by and see why ${business.city} residents choose us time and time again.</p>
            </div>
            <div class="about-image">
                🏢
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services">
        <div class="container">
            <h2 style="text-align: center;">Our Services</h2>
            <p style="text-align: center; max-width: 600px; margin: 0 auto;">We offer a wide range of professional services to meet your needs.</p>
            <div class="services-grid">
                ${services.map(s => `
                <div class="service-card">
                    <div class="service-icon">${s.icon}</div>
                    <h3>${s.name}</h3>
                    <p>${s.description}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="testimonials">
        <div class="container">
            <h2 style="text-align: center;">What Our Customers Say</h2>
            <div class="testimonials-grid">
                <div class="testimonial-card">
                    <div class="stars">★★★★★</div>
                    <p class="testimonial-text">"Absolutely fantastic service! Professional, friendly, and they really know what they're doing. Highly recommend to anyone in ${business.city}!"</p>
                    <p class="testimonial-author">- Sarah M.</p>
                </div>
                <div class="testimonial-card">
                    <div class="stars">★★★★★</div>
                    <p class="testimonial-text">"Been coming here for years. Consistent quality and always a great experience. They treat you like family."</p>
                    <p class="testimonial-author">- Michael R.</p>
                </div>
                <div class="testimonial-card">
                    <div class="stars">★★★★★</div>
                    <p class="testimonial-text">"Fair prices and excellent work. What more could you ask for? ${business.name} is the best in town!"</p>
                    <p class="testimonial-author">- Jennifer L.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact">
        <div class="container">
            <h2 style="text-align: center;">Get in Touch</h2>
            <p style="text-align: center;">We'd love to hear from you. Reach out today!</p>
            <div class="contact-grid">
                <div>
                    <div class="contact-info">
                        <div class="contact-item">
                            <span class="contact-icon">📍</span>
                            <span>${business.address || `${business.city}, ${business.state}`}</span>
                        </div>
                        <div class="contact-item">
                            <span class="contact-icon">📞</span>
                            <a href="tel:${business.phone || '5551234567'}">${business.phone || '(555) 123-4567'}</a>
                        </div>
                        <div class="contact-item">
                            <span class="contact-icon">✉️</span>
                            <a href="mailto:${business.email || 'info@example.com'}">${business.email || 'info@example.com'}</a>
                        </div>
                    </div>
                    <div class="hours">
                        <h3>Hours of Operation</h3>
                        <ul class="hours-list">
                            <li><span>Monday - Friday</span><span>9:00 AM - 6:00 PM</span></li>
                            <li><span>Saturday</span><span>10:00 AM - 4:00 PM</span></li>
                            <li><span>Sunday</span><span>Closed</span></li>
                        </ul>
                    </div>
                </div>
                <form class="contact-form" action="#" method="POST">
                    <div class="form-group">
                        <label for="name">Your Name</label>
                        <input type="text" id="name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone">
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="message">Message</label>
                        <textarea id="message" name="message" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Send Message</button>
                </form>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
        <div class="container">
            <h2>Ready to Get Started?</h2>
            <p>Experience the ${business.name} difference today. We're here to help with all your ${(business.businessType || business.category).toLowerCase()} needs.</p>
            <a href="tel:${business.phone || '5551234567'}" class="btn btn-primary">Call Now: ${business.phone || '(555) 123-4567'}</a>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>${business.name}</h4>
                    <p style="color: rgba(255,255,255,0.7);">Quality ${(business.businessType || business.category).toLowerCase()} services in ${business.city}, ${business.state}.</p>
                </div>
                <div class="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#about">About Us</a></li>
                        <li><a href="#services">Services</a></li>
                        <li><a href="#testimonials">Reviews</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Contact</h4>
                    <ul>
                        <li><a href="tel:${business.phone || '5551234567'}">${business.phone || '(555) 123-4567'}</a></li>
                        <li><a href="mailto:${business.email || 'info@example.com'}">${business.email || 'info@example.com'}</a></li>
                        <li>${business.city}, ${business.state}</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} ${business.name}. All rights reserved.</p>
            </div>
        </div>
    </footer>
</body>
</html>`;

    return Promise.resolve(html);
  }

  /**
   * Get color scheme based on template
   */
  private getTemplateColors(template: WebsiteTemplate): Record<string, string> {
    const schemes: Record<WebsiteTemplate, Record<string, string>> = {
      [WebsiteTemplate.MODERN_MINIMAL]: {
        primary: '#2563eb',
        primaryDark: '#1d4ed8',
        secondary: '#3b82f6',
        accent: '#f59e0b',
        text: '#1f2937',
        textLight: '#6b7280',
        bg: '#ffffff',
        bgAlt: '#f9fafb',
      },
      [WebsiteTemplate.BOLD_COLORFUL]: {
        primary: '#7c3aed',
        primaryDark: '#6d28d9',
        secondary: '#ec4899',
        accent: '#10b981',
        text: '#1f2937',
        textLight: '#6b7280',
        bg: '#ffffff',
        bgAlt: '#faf5ff',
      },
      [WebsiteTemplate.PROFESSIONAL_CLEAN]: {
        primary: '#1e3a5f',
        primaryDark: '#152a45',
        secondary: '#2d5a87',
        accent: '#c9a227',
        text: '#1f2937',
        textLight: '#6b7280',
        bg: '#ffffff',
        bgAlt: '#f8fafc',
      },
    };

    return schemes[template];
  }

  /**
   * Get mock services based on business type
   */
  private getMockServices(businessType: string): Array<{ name: string; icon: string; description: string }> {
    const type = businessType.toLowerCase();

    if (type.includes('barber')) {
      return [
        { name: 'Classic Haircut', icon: '✂️', description: 'Traditional cuts with modern precision' },
        { name: 'Beard Trim', icon: '🧔', description: 'Shape and style your beard perfectly' },
        { name: 'Hot Towel Shave', icon: '🪒', description: 'Relaxing traditional straight razor shave' },
        { name: 'Kids Cuts', icon: '👦', description: 'Patient, friendly service for the little ones' },
      ];
    }

    if (type.includes('restaurant')) {
      return [
        { name: 'Dine-In', icon: '🍽️', description: 'Enjoy our warm, welcoming atmosphere' },
        { name: 'Takeout', icon: '📦', description: 'Fresh food ready when you are' },
        { name: 'Catering', icon: '🎉', description: 'Perfect for events and gatherings' },
        { name: 'Daily Specials', icon: '⭐', description: 'Fresh dishes prepared daily' },
      ];
    }

    if (type.includes('auto') || type.includes('repair')) {
      return [
        { name: 'Oil Change', icon: '🛢️', description: 'Quick, affordable oil changes' },
        { name: 'Brake Service', icon: '🛑', description: 'Keep your family safe on the road' },
        { name: 'Engine Diagnostics', icon: '🔧', description: 'Find and fix the problem fast' },
        { name: 'Tire Service', icon: '🚗', description: 'Rotation, alignment, and more' },
      ];
    }

    if (type.includes('salon')) {
      return [
        { name: 'Haircuts & Styling', icon: '💇', description: 'Precision cuts for any style' },
        { name: 'Color Services', icon: '🎨', description: 'Vibrant, long-lasting color' },
        { name: 'Treatments', icon: '✨', description: 'Deep conditioning and repair' },
        { name: 'Special Occasions', icon: '👰', description: 'Look perfect for your big day' },
      ];
    }

    // Default services
    return [
      { name: 'Consultation', icon: '💬', description: 'Free estimates and expert advice' },
      { name: 'Quality Service', icon: '⭐', description: 'Professional work, every time' },
      { name: 'Fast Turnaround', icon: '⚡', description: 'Quick service without compromise' },
      { name: 'Satisfaction Guaranteed', icon: '✅', description: 'Your happiness is our priority' },
    ];
  }
}

// Export singleton instance
export const claudeClient = new ClaudeClient();
