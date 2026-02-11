import type { IndustryPromptData } from '../../types.js';

export const salonData: IndustryPromptData = {
  heroHeadline: 'Your Beauty, Our Passion',
  heroSubtext:
    'A sanctuary of style where expert colorists and stylists craft looks that are uniquely, beautifully you.',
  services: [
    {
      name: 'Precision Cut & Style',
      price: 'From $55',
      description: 'Consultation, shampoo, precision cut, and blowout tailored to your face shape and lifestyle.',
      icon: 'scissors',
    },
    {
      name: 'Color & Highlights',
      price: 'From $95',
      description: 'Full color, balayage, foils, or ombre — our colorists create depth and dimension that lasts.',
      icon: 'palette',
    },
    {
      name: 'Deep Conditioning',
      price: '$45',
      description: 'Intensive repair treatment that restores moisture, shine, and strength to damaged hair.',
      icon: 'sparkles',
    },
    {
      name: 'Bridal & Special Occasion',
      price: 'Custom',
      description: 'Your big day deserves a look to match. Trial session included with all bridal packages.',
      icon: 'heart',
    },
  ],
  testimonials: [
    {
      text: "I've been to a dozen salons in this city and nothing compares. My stylist actually listened to what I wanted and delivered something even better than I imagined.",
      author: 'Priya N.',
      rating: 5,
    },
    {
      text: "The balayage they did is the best color work I've ever had. Three months later and I'm still getting compliments. Worth every penny.",
      author: 'Samantha G.',
      rating: 5,
    },
    {
      text: "They did my hair for my wedding and I cried happy tears when I saw it. The trial was thorough and the day-of was absolutely flawless.",
      author: 'Jessica M.',
      rating: 5,
    },
  ],
  aboutText:
    "We believe great hair starts with genuine connection. Our stylists take the time to understand your vision, your lifestyle, and your hair's unique needs before ever picking up scissors. With ongoing education in the latest techniques and a commitment to premium products, we create results that look stunning on day one and grow out beautifully.",
  ctaText: 'Book Your Appointment',
  colorPalette: {
    primary: '#be185d',
    accent: '#e11d48',
    background: '#faf8f5',
    surface: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#6b7280',
  },
  fontPairings: {
    heading: 'Cormorant Garamond',
    body: 'Inter',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap',
  },
};
