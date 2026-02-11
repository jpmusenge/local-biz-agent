import type { IndustryPromptData } from '../../types.js';

export const autoRepairData: IndustryPromptData = {
  heroHeadline: 'Honest Work. Fair Prices. Every Time.',
  heroSubtext:
    'Certified mechanics, transparent pricing, and the kind of service that keeps your car — and your trust — running strong.',
  services: [
    {
      name: 'Oil Change',
      price: 'From $39',
      description: 'Full synthetic and conventional options. Includes filter, fluid top-off, and multi-point inspection.',
      icon: 'droplets',
    },
    {
      name: 'Brake Service',
      price: 'From $149',
      description: 'Pads, rotors, fluid flush, and full brake system inspection. Your family\'s safety comes first.',
      icon: 'shield',
    },
    {
      name: 'Engine Diagnostics',
      price: '$89',
      description: 'State-of-the-art computer diagnostics to find the problem fast and fix it right.',
      icon: 'search',
    },
    {
      name: 'Tire Service',
      price: 'From $25',
      description: 'Rotation, balancing, alignment, and new tire installation. All major brands available.',
      icon: 'circle',
    },
  ],
  testimonials: [
    {
      text: "Finally found a shop I can trust. They showed me exactly what needed fixing, didn't upsell me on anything, and the price was exactly what they quoted.",
      author: 'Brian H.',
      rating: 5,
    },
    {
      text: "My check engine light came on and I was panicking. They got me in same-day, diagnosed it in 20 minutes, and had me back on the road by lunch.",
      author: 'Angela R.',
      rating: 5,
    },
    {
      text: "Been bringing both our family cars here for five years. Consistent quality, honest pricing, and they always remember my name. That means a lot.",
      author: 'Robert & Linda P.',
      rating: 5,
    },
  ],
  aboutText:
    "We're a family-owned shop built on one principle: treat every car like it's our own. Our ASE-certified mechanics combine years of hands-on experience with the latest diagnostic technology. We explain every repair in plain English, provide upfront pricing with no surprises, and stand behind our work with a solid warranty. Your vehicle is in good hands.",
  ctaText: 'Schedule Service Today',
  colorPalette: {
    primary: '#f97316',
    accent: '#06b6d4',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
  },
  fontPairings: {
    heading: 'Space Grotesk',
    body: 'Inter',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap',
  },
};
