import type { IndustryPromptData } from '../../types.js';

export const restaurantData: IndustryPromptData = {
  heroHeadline: 'A Taste Worth Coming Back For',
  heroSubtext:
    'Fresh ingredients, time-honored recipes, and a warm atmosphere that makes every meal feel like a celebration.',
  services: [
    {
      name: 'Dine-In Experience',
      price: '',
      description: 'Enjoy our warm, welcoming dining room with attentive service and a curated atmosphere.',
      icon: 'utensils',
    },
    {
      name: 'Online Ordering',
      price: '',
      description: 'Order ahead for pickup. Fresh food ready when you are — no waiting.',
      icon: 'smartphone',
    },
    {
      name: 'Private Events',
      price: 'Custom',
      description: 'Host your next celebration with us. Custom menus and dedicated service for groups.',
      icon: 'party-popper',
    },
    {
      name: 'Catering',
      price: 'Custom',
      description: 'From office lunches to weddings, we bring the flavor to your event.',
      icon: 'truck',
    },
  ],
  testimonials: [
    {
      text: "The flavors here are unreal. Every dish tastes like it was made with genuine love. This is our family's go-to spot for Friday nights.",
      author: 'Carlos M.',
      rating: 5,
    },
    {
      text: 'Had our anniversary dinner here and it was perfect. The staff made us feel so special. Already planning our next visit.',
      author: 'Rachel & Tom S.',
      rating: 5,
    },
    {
      text: 'Best lunch spot in the area, period. Fast, fresh, and the portions are generous. I eat here at least twice a week.',
      author: 'David L.',
      rating: 5,
    },
  ],
  aboutText:
    "Our kitchen is built on a simple belief: great food starts with great ingredients and the hands that prepare them. Every dish is made from scratch, sourced locally when possible, and served with pride. Whether you're joining us for a quick lunch or a special dinner, you'll taste the difference that care and craft make.",
  ctaText: 'Reserve a Table',
  colorPalette: {
    primary: '#c2410c',
    accent: '#ea580c',
    background: '#1c1917',
    surface: '#292524',
    text: '#fafaf9',
    textMuted: '#a8a29e',
  },
  fontPairings: {
    heading: 'Playfair Display',
    body: 'Inter',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600&display=swap',
  },
};
