// Premium Restaurant Website Prompt
// Produces $2,000+ agency-quality restaurant websites with real images,
// realistic menu items, structured data, and sophisticated animations.

import type { BusinessInfo } from '../types.js';

// ==================== QUALITY CHECKER ====================

export interface QualityCheckResult {
  passed: boolean;
  issues: string[];    // Hard failures — website should be rejected/retried
  warnings: string[];  // Soft issues — logged but not blocking
}

/**
 * Scan generated HTML for quality red flags.
 * Called after generation to catch AI shortcuts before saving.
 */
export function checkWebsiteQuality(html: string): QualityCheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // ── Hard failures ──────────────────────────────────────────────

  if (/lorem\s+ipsum/i.test(html)) {
    issues.push('Contains "Lorem ipsum" placeholder text');
  }

  // Emoji detection — covers most common Unicode emoji ranges
  if (/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/u.test(html)) {
    issues.push('Contains emoji characters — use Lucide icons or SVG instead');
  }

  if (/welcome\s+to\s+our\s+restaurant/i.test(html)) {
    issues.push('Contains generic heading "Welcome to Our Restaurant"');
  }

  if (!/\<\/html\>/i.test(html)) {
    issues.push('HTML is incomplete — missing </html> closing tag (generation was cut off)');
  }

  if (html.length < 18000) {
    issues.push(`Website too short (${html.length} chars) — likely incomplete generation, expected 20,000+ chars`);
  }

  // Unfilled template slots
  if (/\[BUSINESS NAME\]|\[CITY\]|\[PHONE\]|\[ADDRESS\]/i.test(html)) {
    issues.push('Contains unfilled template placeholders like [BUSINESS NAME]');
  }

  // ── Soft warnings ──────────────────────────────────────────────

  if (!html.includes('images.unsplash.com')) {
    warnings.push('No Unsplash images found — website may lack visual impact');
  }

  if (!html.includes('application/ld+json')) {
    warnings.push('Missing JSON-LD structured data — hurts local SEO');
  }

  if (!html.includes('og:title')) {
    warnings.push('Missing Open Graph meta tags — affects social sharing');
  }

  if (!html.includes('og:description')) {
    warnings.push('Missing og:description meta tag');
  }

  if (!/\$\d+/.test(html)) {
    warnings.push('No prices found in menu section — dishes may lack pricing');
  }

  if (!html.includes('scroll-behavior')) {
    warnings.push('Missing smooth scroll behavior');
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  };
}

// ==================== PREMIUM PROMPT BUILDER ====================

/**
 * Build a premium restaurant website prompt for Claude or Gemini.
 *
 * This replaces the generic base-prompt for restaurant businesses.
 * The output should look like a $2,000–$3,000 custom agency website:
 * real Unsplash photography, realistic menu items with prices,
 * a genuine chef story, smooth animations, and proper SEO markup.
 */
export function buildRestaurantPremiumPrompt(business: BusinessInfo): string {
  const phone = business.phone ?? '(662) 555-0142';
  const address = business.address ?? `${business.city}, ${business.state}`;
  const year = new Date().getFullYear();

  return `You are a senior frontend engineer at a top-tier digital agency (think Instrument, Fantasy Interactive, or Huge). Your client is a local restaurant that needs a website that looks like it cost $3,000 to build. Every detail matters.

## BUSINESS DETAILS
- Name: ${business.name}
- Location: ${business.city}, ${business.state}
- Address: ${address}
- Phone: ${phone}

## MANDATORY TECH STACK

Include exactly these CDN resources in the <head>:

\`\`\`html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
\`\`\`

Tailwind config block (required):
\`\`\`html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          gold: '#c8a96e',
          'gold-dark': '#8b6914',
          'warm-black': '#0c0a08',
          'warm-surface': '#1a1410',
          'warm-card': '#221c16',
          'warm-muted': '#6b5a4e',
        },
        fontFamily: {
          display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
          body: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        },
      },
    },
  }
</script>
\`\`\`

Initialize Lucide at end of body: \`<script>lucide.createIcons();</script>\`

## HEAD META (required)

Include all of these in <head>:
- \`<meta name="description" content="[Compelling 155-char description mentioning ${business.name} and ${business.city}, ${business.state}]">\`
- \`<meta property="og:title" content="${business.name} | ${business.city}, ${business.state}">\`
- \`<meta property="og:description" content="[Same as meta description]">\`
- \`<meta property="og:image" content="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&h=630&q=80">\`
- \`<meta property="og:type" content="restaurant">\`
- \`<link rel="canonical" href="#">\`

## JSON-LD STRUCTURED DATA (required for local SEO)

Add this in <head> with real values filled in:
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "${business.name}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "${address}",
    "addressLocality": "${business.city}",
    "addressRegion": "${business.state}",
    "addressCountry": "US"
  },
  "telephone": "${phone}",
  "servesCuisine": "[cuisine type appropriate for ${business.city}, ${business.state}]",
  "priceRange": "$$",
  "openingHours": ["Mo-Th 11:00-21:00", "Fr-Sa 11:00-22:00", "Su 10:00-20:00"],
  "url": "#"
}
</script>
\`\`\`

## DESIGN SYSTEM

Color palette (use Tailwind custom colors from config above):
- Backgrounds: bg-warm-black (#0c0a08), bg-warm-surface (#1a1410), bg-warm-card (#221c16)
- Accent: text-gold (#c8a96e), border-gold, bg-gold
- Muted text: text-warm-muted (#6b5a4e)
- Body text: text-stone-200
- Headings: text-stone-50

Typography rules:
- All section headings and hero text: font-display (Cormorant Garamond)
- All body copy, nav, buttons, captions: font-body (Source Sans 3)
- Hero headline: text-6xl md:text-7xl lg:text-8xl, italic, font-light
- Section headings: text-4xl md:text-5xl, font-semibold
- Eyebrow labels: text-xs tracking-[0.25em] uppercase font-body font-medium text-gold

Image rules — use images.unsplash.com with this format:
  https://images.unsplash.com/{photo-id}?auto=format&fit=crop&w={width}&h={height}&q=80

IMPORTANT: source.unsplash.com is shut down — DO NOT use it. Only use images.unsplash.com.

Use ONLY the photo IDs from the curated library below — do not invent IDs.

**Hero background** — pick one (full-bleed, 1920×1080):
  photo-1517248135467-4c7edcad34c4  (warm, candlelit restaurant interior)
  photo-1414235077428-338989a2e8c0  (elegant dining room, orange warmth)
  photo-1424847651672-bf20a4b0982b  (intimate evening restaurant)

**Chef / About portrait** — pick one (900×1100):
  photo-1556909114-f6e7ad7d3136    (chef in professional kitchen)
  photo-1607631568010-a87245c0daf2  (chef plating a dish)
  photo-1581299894007-aaa50297cf16  (chef at work, white jacket)

**Menu item photos** — pick 6 that match the dishes (600×400 each):
  photo-1504674900247-0877df9cc836  (beautiful food spread, top-down)
  photo-1476224203421-9ac39bcb3df1  (gourmet plated dish)
  photo-1565299585323-38d6b0865b47  (fine dining close-up)
  photo-1555396273-367ea4eb4db5    (pasta dish, rustic)
  photo-1432139555190-58524dae6a55  (classic pizza, wood-fired)
  photo-1565958011703-44f9829ba187  (elegant dessert plating)
  photo-1544025162-d76538537a78    (grilled steak / BBQ meat)
  photo-1534482421-64566f976cfa    (shrimp / seafood dish)
  photo-1512621776951-a57141f2eefd  (fresh salad)
  photo-1473093226795-af9932fe5856  (fish / seafood plated)

**Gallery images** — use all 6 in varied aspect ratios:
  photo-1559329007-40df8a9345d8    (restaurant table setting — 800×600)
  photo-1536935338788-846bb9981813  (craft cocktails — 600×800)
  photo-1510812431401-41d2bd2722f3  (wine bottles in cellar — 600×800)
  photo-1466978913421-dad2ebd01d17  (warm dining atmosphere — 800×600)
  photo-1414235077428-338989a2e8c0  (restaurant interior — 800×600)
  photo-1504674900247-0877df9cc836  (food spread — 800×600)

## SECTIONS (build exactly these, in this order)

### 1. STICKY HEADER / NAV
- Initial state: bg-transparent, backdrop-blur-none
- After 80px scroll (JS): bg-warm-black/95 backdrop-blur-md border-b border-gold/10 shadow-xl
- Left: restaurant name in font-display text-2xl text-gold
- Desktop nav: About, Menu, Gallery, Reviews, Contact (text-stone-300 hover:text-gold transition)
- Right CTA: "Reserve a Table" — border border-gold text-gold px-5 py-2 text-sm tracking-wide hover:bg-gold hover:text-warm-black transition-all
- Mobile: hamburger (Lucide "menu" icon) toggles mobile nav, close with Lucide "x" icon

### 2. HERO (min-h-screen)
- Full-bleed background image via inline style: background-image: url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80'); background-size: cover; background-position: center; background-attachment: fixed;
- Layered overlays: absolute inset-0 bg-gradient-to-b from-warm-black/70 via-warm-black/50 to-warm-black/80
- Centered content (flex items-center justify-center):
  - Eyebrow: "${business.city}, ${business.state}" in gold small caps tracking-widest
  - Headline: font-display italic text-6xl lg:text-8xl text-stone-50 leading-none — write a SHORT, evocative headline (NOT "A Taste Worth Coming Back For" — be more specific to the restaurant or city character)
  - Tagline: 1 sentence, font-body font-light text-stone-300 text-xl max-w-xl mx-auto
  - Two CTAs in a flex gap-4 row:
    * Primary: "Reserve a Table" — bg-gold text-warm-black px-8 py-4 font-body font-semibold tracking-wide hover:bg-gold-dark transition-all hover:-translate-y-0.5 hover:shadow-xl
    * Ghost: "Explore the Menu" — border border-stone-400 text-stone-200 px-8 py-4 hover:border-gold hover:text-gold transition-all
- Bottom: scroll indicator — Lucide "chevron-down" icon animated with CSS bounce, text-gold/60

### 3. ABOUT
- Two-column grid (md:grid-cols-2), gap-16, py-28
- LEFT column (text):
  - Gold accent line: \`<div class="w-12 h-px bg-gold mb-8"></div>\`
  - Eyebrow: "Our Story"
  - Heading: "A Kitchen Built on [something specific to ${business.city} culture or the restaurant's identity]"
  - Body: Write 2 real paragraphs. Mention: how ${business.name} started, the founder/head chef (invent a plausible name like "Chef Marcus Williams" or "Chef Rosa Delgado"), local ingredients or suppliers, what makes them different. Do NOT use the word "delicious" or "amazing". Be specific and human.
  - Founding year: mention a year (pick something between 2008 and 2019 that sounds natural)
  - A small detail stat row: "Est. [year]" | "[City] Grown" | "Family Owned" in gold with text-gold dividers
- RIGHT column (image):
  - Full-height image: <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&h=1100&q=80" alt="Chef at ${business.name}" class="w-full h-full object-cover rounded-sm" loading="lazy">
  - Subtle gold border offset: position relative, after pseudo-element or a div offset border in gold/20

### 4. MENU HIGHLIGHTS — "Signature Dishes"
- Background: bg-warm-surface
- Eyebrow: "From Our Kitchen"
- Heading: "Signature Dishes"
- Intro: 1 sentence about the menu philosophy

Generate exactly 6 menu items appropriate for a restaurant in ${business.city}, ${business.state}. Consider the local cuisine (Southern US, Mississippi). Make them feel real:
- Use realistic names (not "Dish 1")
- Prices in $X.XX format, ranging $11.00–$34.00
- Each item: name, price, 2-sentence description, search term for Unsplash food photo

Card layout (grid sm:grid-cols-2 lg:grid-cols-3 gap-6):
Each card:
- Unsplash food image at top — pick from the menu item library above, e.g.: <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=400&q=80" loading="lazy" class="w-full h-48 object-cover">
- Below image: padding, dish name, price badge (text-gold font-semibold), description
- Hover: scale-[1.02] shadow-2xl border-t-2 border-gold transition-all duration-300
- Card bg: bg-warm-card border border-warm-muted/20

### 5. GALLERY
- Heading: "The Atmosphere"
- CSS column layout: columns-2 md:columns-3 gap-3
- 6 images from the Gallery library above (varied aspect ratios — some portrait, some landscape, add break-inside-avoid to each)
- Each image: rounded-sm overflow-hidden, hover:opacity-90 transition, cursor-zoom-in
- All images get loading="lazy" and descriptive alt text

### 6. REVIEWS
- Background: bg-warm-black
- Heading: "What Guests Are Saying"
- Grid: md:grid-cols-3 gap-8
- 3 review cards. Each must:
  - Reference a SPECIFIC dish or experience at ${business.name} (e.g., "The smoked catfish was unlike anything I've had" or "We celebrated our daughter's graduation here")
  - Reviewer: "[First name] [Last initial]." with context (e.g., "— Local regular" or "— Visited for anniversary")
  - Star rating: 5 filled Lucide "star" icons with class text-gold fill-current
  - Card: bg-warm-card border border-warm-muted/20 p-8 rounded-sm
  - Gold quotation mark: font-display text-6xl text-gold/20 leading-none mb-4

### 7. LOCATION & HOURS
- Two-column: md:grid-cols-2 gap-12 py-24
- LEFT: Map placeholder
  - \`<div class="w-full aspect-video bg-warm-surface border border-warm-muted/20 rounded-sm flex flex-col items-center justify-center gap-3">\`
  - Inside: Lucide "map-pin" icon (w-10 h-10 text-gold), text "Find Us on the Map", address in text-warm-muted
- RIGHT: Info column
  - Address with Lucide "map-pin" (inline): ${address}
  - Phone with Lucide "phone": <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a>
  - Hours table: use \`<dl>\` pattern with day/hours pairs, highlight today in text-gold font-semibold
    * Mon–Thu: 11:00 AM – 9:00 PM
    * Fri–Sat: 11:00 AM – 10:00 PM
    * Sunday: 10:00 AM – 8:00 PM

### 8. RESERVATION / CONTACT
- Background: bg-warm-surface
- Centered two-column (form + contact details)
- Heading: "Reserve Your Table"
- Form fields (styled inputs: bg-warm-card border border-warm-muted/30 text-stone-200 focus:border-gold outline-none px-4 py-3 w-full rounded-sm):
  - Name (text), Email (email), Phone (tel)
  - Party Size (select: "1–2 guests", "3–4 guests", "5–6 guests", "7+ guests")
  - Preferred Date (date input)
  - Special requests (textarea rows-4)
  - Submit: "Request Reservation" — full-width bg-gold text-warm-black font-semibold py-4 hover:bg-gold-dark transition
- Right side (contact details): phone, email (mailto:info@example.com), address — each with Lucide icon

### 9. FOOTER
- bg-warm-black border-t border-warm-muted/20
- Three columns: brand (name + tagline + socials), Quick Links, Hours Summary
- Social icons: Lucide "instagram", "facebook", "twitter" — w-5 h-5 text-warm-muted hover:text-gold
- Bottom bar: copyright © ${year} ${business.name} · All rights reserved

## ANIMATIONS

Add a <style> tag with:
\`\`\`css
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.75s ease, transform 0.75s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
\`\`\`

Add a <script> block before </body> with:
1. IntersectionObserver that adds .visible to all .reveal elements
2. Nav background toggle: window.addEventListener('scroll', ...) — add bg class after 80px
3. lucide.createIcons()

## STRICT RULES

- NO Lorem ipsum anywhere
- NO emojis — use only Lucide icons or SVG
- NO generic headings like "Welcome to Our Restaurant" or "About Us" (use specific, evocative headings)
- NO placeholder prices like "$XX" — use real dollar amounts
- ALL images must have descriptive alt attributes and loading="lazy"
- The <html> opening tag MUST include \`style="scroll-behavior: smooth;"\` — this is non-negotiable
- Semantic HTML: use <header>, <nav>, <main>, <section>, <footer>, <article>
- Every section must have id attribute for nav anchor links

## OUTPUT

Return ONLY the complete HTML. No markdown, no explanation, no code fences.
The document MUST begin with exactly:
\`\`\`
<!DOCTYPE html>
<html lang="en" style="scroll-behavior: smooth;">
\`\`\`
The \`style="scroll-behavior: smooth;"\` attribute on <html> is REQUIRED — do not omit it.
End with \`</html>\`. The full output must be at least 500 lines of well-formatted HTML.`;
}
