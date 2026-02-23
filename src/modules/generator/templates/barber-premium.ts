// Premium Barber Shop Website Prompt
// Produces $2,000+ agency-quality barbershop websites with real images,
// authentic service pricing, structured data, and masculine luxury design.

import type { BusinessInfo } from '../types.js';

// ==================== PREMIUM PROMPT BUILDER ====================

/**
 * Build a premium barbershop website prompt for Claude or Gemini.
 *
 * This replaces the generic base-prompt for barber shop businesses.
 * The output should look like a $2,000–$3,000 custom agency website:
 * real Unsplash photography, authentic service menus with prices,
 * a genuine owner/barber story, smooth animations, and proper SEO markup.
 */
export function buildBarberPremiumPrompt(business: BusinessInfo): string {
  const phone = business.phone ?? '(662) 555-0183';
  const address = business.address ?? `${business.city}, ${business.state}`;
  const year = new Date().getFullYear();

  return `You are a senior frontend engineer at a top-tier digital agency. Your client is a local barbershop that needs a website that looks like it cost $3,000 to build — masculine luxury, precision craftsmanship, old-school meets modern. Every detail matters.

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
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
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
          gold: '#c9a227',
          'gold-dark': '#9a7a1a',
          'shop-black': '#0f0f0f',
          'shop-surface': '#1a1a1a',
          'shop-card': '#242424',
          'shop-muted': '#6b6b6b',
        },
        fontFamily: {
          display: ['"Playfair Display"', 'Georgia', 'serif'],
          body: ['Inter', 'system-ui', 'sans-serif'],
        },
      },
    },
  }
</script>
\`\`\`

Initialize Lucide at end of body: \`<script>lucide.createIcons();</script>\`

## HEAD META (required)

Include all of these in <head>:
- \`<meta name="description" content="[Compelling 155-char description mentioning ${business.name}, expert barbers, and ${business.city}, ${business.state}]">\`
- \`<meta property="og:title" content="${business.name} | ${business.city}, ${business.state}">\`
- \`<meta property="og:description" content="[Same as meta description]">\`
- \`<meta property="og:image" content="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&h=630&q=80">\`
- \`<meta property="og:type" content="website">\`
- \`<link rel="canonical" href="#">\`

## JSON-LD STRUCTURED DATA (required for local SEO)

Add this in <head> with real values filled in:
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "name": "${business.name}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "${address}",
    "addressLocality": "${business.city}",
    "addressRegion": "${business.state}",
    "addressCountry": "US"
  },
  "telephone": "${phone}",
  "priceRange": "$$",
  "openingHours": ["Mo-Fr 09:00-19:00", "Sa 08:00-17:00"],
  "url": "#"
}
</script>
\`\`\`

## DESIGN SYSTEM

Color palette (use Tailwind custom colors from config above):
- Backgrounds: bg-shop-black (#0f0f0f), bg-shop-surface (#1a1a1a), bg-shop-card (#242424)
- Accent: text-gold (#c9a227), border-gold, bg-gold
- Muted text: text-shop-muted (#6b6b6b)
- Body text: text-zinc-200
- Headings: text-zinc-50

Typography rules:
- All section headings and hero text: font-display (Playfair Display)
- All body copy, nav, buttons, captions: font-body (Inter)
- Hero headline: text-5xl md:text-7xl lg:text-8xl, font-black
- Section headings: text-4xl md:text-5xl, font-bold
- Eyebrow labels: text-xs tracking-[0.3em] uppercase font-body font-semibold text-gold

## IMAGE LIBRARY — Use ONLY these URLs (source.unsplash.com is shut down)

Use images.unsplash.com with this format:
  https://images.unsplash.com/{photo-id}?auto=format&fit=crop&w={width}&h={height}&q=80

IMPORTANT: Do NOT use source.unsplash.com — it is shut down. Only use images.unsplash.com with the photo IDs below.

**Hero background** — pick one (1920×1080):
  photo-1585747860715-2ba37e788b70  (classic barbershop interior, warm lighting)
  photo-1503951914875-452162b0f3f1  (barber working, moody atmosphere)
  photo-1605497788044-5a32c7078486  (modern barbershop chairs, dark tones)

**Barber / owner portrait** — pick one (900×1100):
  photo-1599351431202-1e0f0137899a  (professional barber with apron)
  photo-1582095133179-bfd08e2fb6b8  (barber mid-cut, focused)
  photo-1612817288484-6f916006741a  (barber at work, side profile)

**Service / haircut photos** — pick 6 that fit the services (600×400 each):
  photo-1562004760-aceed7bb0fe3    (haircut close-up, precision fade)
  photo-1567894340315-735d7c361db0  (clean fade haircut result)
  photo-1619895862022-09114b41f16f  (hot towel shave, straight razor)
  photo-1622286342621-4bd786c2447c  (sharp lined haircut, side view)
  photo-1598887141099-86c46b08f1de  (barber scissors and tools)
  photo-1512864084096-7ddb36673c05  (barbershop atmosphere, chairs)
  photo-1585747860715-2ba37e788b70  (barbershop interior, classic)
  photo-1503951914875-452162b0f3f1  (barber at work, detailed)

**Gallery images** — use all 6 in varied aspect ratios:
  photo-1512864084096-7ddb36673c05  (barbershop atmosphere — 800×600)
  photo-1585747860715-2ba37e788b70  (classic shop interior — 600×800)
  photo-1599351431202-1e0f0137899a  (barber portrait — 600×800)
  photo-1562004760-aceed7bb0fe3    (precision haircut — 800×600)
  photo-1503951914875-452162b0f3f1  (moody barber shot — 800×600)
  photo-1598887141099-86c46b08f1de  (tools of the trade — 800×600)

## SECTIONS (build exactly these, in this order)

### 1. STICKY HEADER / NAV
- Initial state: bg-transparent
- After 80px scroll (JS): bg-shop-black/95 backdrop-blur-md border-b border-gold/15 shadow-2xl
- Left: shop name in font-display text-2xl text-gold italic
- Desktop nav: About, Services, Gallery, Reviews, Contact (text-zinc-400 hover:text-gold transition text-sm tracking-wide)
- Right CTA: "Book a Cut" — bg-gold text-shop-black px-5 py-2.5 text-sm font-semibold tracking-wider hover:bg-gold-dark transition-all
- Mobile: Lucide "menu" icon toggles mobile nav, Lucide "x" to close

### 2. HERO (min-h-screen)
- Full-bleed background image via inline style: background-image: url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1920&q=80'); background-size: cover; background-position: center;
- Layered overlays: absolute inset-0 bg-gradient-to-r from-shop-black/90 via-shop-black/60 to-shop-black/30
- Content aligned LEFT (max-w-2xl, pl-8 md:pl-16 lg:pl-24):
  - Eyebrow: "Est. [pick a year between 2005–2018] · ${business.city}, ${business.state}" in gold tracking-widest text-xs uppercase
  - Gold accent line: \`<div class="w-16 h-px bg-gold my-6"></div>\`
  - Headline: font-display font-black text-5xl lg:text-7xl text-zinc-50 leading-none — write something SHORT and powerful (e.g., "Sharp. Clean. Legendary." or something specific to the city's culture — NOT generic)
  - Subtext: 1 punchy sentence, font-body text-zinc-400 text-lg max-w-md
  - Two CTAs:
    * Primary: "Book Your Cut" — bg-gold text-shop-black px-8 py-4 font-semibold tracking-wide hover:bg-gold-dark transition hover:-translate-y-0.5 hover:shadow-xl
    * Ghost: "View Services" — border border-zinc-600 text-zinc-300 px-8 py-4 hover:border-gold hover:text-gold transition
- Bottom-left: scroll indicator with Lucide "chevron-down" text-gold/50 animate-bounce

### 3. ABOUT
- Two-column grid (md:grid-cols-2), gap-16, py-28, bg-shop-surface
- RIGHT column (image — image first on desktop, order-first on mobile):
  - Full-height portrait: <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&h=1100&q=80" alt="Master Barber at ${business.name}" class="w-full h-full object-cover">
  - Thin gold border offset: position relative with an absolutely positioned div: border border-gold/30 inset-0 translate-x-4 translate-y-4 -z-10 absolute
- LEFT column (text):
  - Gold accent line: \`<div class="w-12 h-px bg-gold mb-8"></div>\`
  - Eyebrow: "The Craft"
  - Heading: "A Cut Above [something specific to ${business.city} or the shop's identity]"
  - Body: Write 2 real paragraphs. Mention: how ${business.name} started, the owner/master barber (invent a plausible name like "Marcus Webb" or "Darnell Johnson"), the neighborhood or community, the specific techniques they specialize in, what sets them apart. Be human and specific. Do NOT use the word "amazing" or "passion for excellence".
  - Founded: mention a year (between 2005–2018 that sounds natural)
  - Small stat row: "Est. [year]" | "[City]'s Own" | "Walk-Ins Welcome" in text-gold with border-r border-gold/30

### 4. SERVICES — "The Menu"
- Background: bg-shop-black
- Eyebrow: "The Chair"
- Heading: "Our Services"
- Subheading: 1 sentence on the craft and quality

Generate exactly 6 services for a barbershop in ${business.city}, ${business.state}. Make them feel authentic and local:
- Realistic service names (not "Service 1")
- Prices in $X format, ranging $15–$50
- Each: name, price, 2-sentence description, relevant Unsplash photo ID from the service library above

Card layout (grid sm:grid-cols-2 lg:grid-cols-3 gap-6):
Each card:
- Service image at top: <img src="https://images.unsplash.com/photo-[ID]?auto=format&fit=crop&w=600&h=400&q=80" loading="lazy" class="w-full h-44 object-cover">
- Below: bg-shop-card p-6, service name (font-display text-xl text-zinc-50), price badge (text-gold font-bold text-lg), description (text-shop-muted text-sm leading-relaxed)
- Hover: border-t-2 border-gold scale-[1.02] shadow-2xl transition-all duration-300
- Card: border border-white/5

### 5. GALLERY
- Background: bg-shop-surface
- Heading: "The Shop"
- CSS column layout: columns-2 md:columns-3 gap-3
- 6 images from gallery library above (varied portrait/landscape, break-inside-avoid)
- Each: rounded-none overflow-hidden, hover:opacity-85 transition-opacity, cursor-zoom-in, loading="lazy", descriptive alt text

### 6. REVIEWS
- Background: bg-shop-black
- Heading: "Word on the Street"
- Grid: md:grid-cols-3 gap-8
- 3 review cards. Each must:
  - Reference a SPECIFIC service or detail at ${business.name} (e.g., "The fade was so clean I went straight to church" or "First time getting a straight razor shave — felt like a new man")
  - Reviewer: "[First name] [Last initial]." with context (e.g., "— Regular since 2019" or "— Came in before my wedding")
  - Star rating: 5 Lucide "star" icons with class text-gold fill-current (use fill-gold via inline style if needed)
  - Card: bg-shop-card border border-white/5 p-8
  - Large quote mark: font-display text-7xl text-gold/15 leading-none mb-2

### 7. HOURS & LOCATION
- Two-column: md:grid-cols-2 gap-12 py-24, bg-shop-surface
- LEFT: Map placeholder
  - \`<div class="w-full aspect-video bg-shop-black border border-white/10 flex flex-col items-center justify-center gap-4">\`
  - Inside: Lucide "map-pin" w-10 h-10 text-gold, "Find the Shop" in font-display text-xl text-zinc-50, address in text-shop-muted
- RIGHT: Info
  - Address with Lucide "map-pin": ${address}
  - Phone with Lucide "phone": <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a>
  - Hours in \`<dl>\` pattern, highlight today in text-gold font-semibold:
    * Mon–Fri: 9:00 AM – 7:00 PM
    * Saturday: 8:00 AM – 5:00 PM
    * Sunday: Closed

### 8. BOOKING / CONTACT
- Background: bg-shop-black
- Heading: "Get in the Chair"
- Two-column: form left, contact details right
- Form fields (bg-shop-card border border-white/10 text-zinc-200 focus:border-gold outline-none px-4 py-3 w-full rounded-none):
  - Name (text), Phone (tel), Email (email)
  - Preferred Service (select: "Classic Fade", "Beard Sculpt", "Hot Towel Shave", "Haircut & Beard Combo", "Line-Up / Edge-Up", "Kids Cut", "Other")
  - Preferred Day (select: Mon, Tue, Wed, Thu, Fri, Sat)
  - Message / notes (textarea rows-3)
  - Submit: "Request Appointment" — full-width bg-gold text-shop-black font-semibold py-4 hover:bg-gold-dark tracking-wide transition
- Right side: phone (clickable), email, address, walk-ins welcome note — each with Lucide icon in gold

### 9. FOOTER
- bg-shop-black border-t border-white/10
- Three columns: brand (name in font-display italic text-gold + tagline + social icons), Quick Links, Hours Summary
- Social icons: Lucide "instagram", "facebook", "twitter" — text-shop-muted hover:text-gold w-5 h-5
- Bottom bar: © ${year} ${business.name} · All Rights Reserved · ${business.city}, ${business.state}

## ANIMATIONS

Add a <style> tag with:
\`\`\`css
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
\`\`\`

Add a <script> block before </body>:
1. IntersectionObserver adding .visible to all .reveal elements
2. Nav background toggle after 80px scroll
3. lucide.createIcons()

## STRICT RULES

- NO Lorem ipsum anywhere
- NO emojis — Lucide icons or SVG only
- NO generic headings like "Welcome to Our Barbershop" or "About Us"
- NO placeholder prices like "$XX" — use real dollar amounts
- ALL images: descriptive alt attributes + loading="lazy"
- The <html> tag MUST include \`style="scroll-behavior: smooth;"\` — required
- Semantic HTML: <header>, <nav>, <main>, <section>, <footer>
- Every section must have an id attribute for nav anchor links

## OUTPUT

Return ONLY the complete HTML. No markdown, no explanation, no code fences.
The document MUST begin with exactly:
\`\`\`
<!DOCTYPE html>
<html lang="en" style="scroll-behavior: smooth;">
\`\`\`
End with \`</html>\`. The full output must be at least 500 lines of well-formatted HTML.`;
}
