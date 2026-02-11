import type { IndustryPromptData } from '../../types.js';

export const barberShopData: IndustryPromptData = {
  heroHeadline: 'Where Tradition Meets Precision',
  heroSubtext:
    'Step into a grooming experience crafted by master barbers. Classic techniques, modern style, and the kind of attention to detail that keeps gentlemen coming back.',
  services: [
    {
      name: 'Classic Fade',
      price: '$25',
      description: 'Precision skin, low, mid, or high fade blended to perfection with shears and clippers.',
      icon: 'scissors',
    },
    {
      name: 'Beard Sculpt',
      price: '$20',
      description: 'Hot towel prep, straight razor edges, and sculpted lines that frame your face.',
      icon: 'pen-tool',
    },
    {
      name: 'Hot Towel Shave',
      price: '$30',
      description: 'The full ritual — steamed towels, pre-shave oil, straight razor, and cold towel finish.',
      icon: 'flame',
    },
    {
      name: 'Haircut & Beard Combo',
      price: '$40',
      description: 'Our signature package: precision cut plus full beard sculpt with hot towel treatment.',
      icon: 'crown',
    },
    {
      name: 'Line-Up / Edge-Up',
      price: '$15',
      description: 'Clean up your hairline, temples, and neckline between cuts.',
      icon: 'minus',
    },
    {
      name: 'Kids Cut (Under 12)',
      price: '$18',
      description: 'Patient, friendly service for the young gentlemen. Same precision, relaxed pace.',
      icon: 'smile',
    },
  ],
  testimonials: [
    {
      text: "Been coming here every two weeks for three years. Marcus knows exactly how I like my fade without me saying a word. Best shop in the city, hands down.",
      author: 'Darnell W.',
      rating: 5,
    },
    {
      text: "First time I've ever had a straight razor shave. The hot towel treatment was incredible — felt like I was at a five-star spa. My face has never been this smooth.",
      author: 'James K.',
      rating: 5,
    },
    {
      text: "Brought my son for his first real haircut. The barbers were so patient with him, and he left looking sharp. Now he asks to go back every month.",
      author: 'Michelle T.',
      rating: 5,
    },
  ],
  aboutText:
    "We're not just a barbershop — we're a neighborhood institution. Our barbers bring decades of combined experience and a genuine passion for the craft. From classic cuts to modern fades, every service comes with the kind of care and conversation that turns first-time visitors into lifelong regulars. Pull up a chair, grab a coffee, and let us take care of the rest.",
  ctaText: 'Book Your Cut Today',
  colorPalette: {
    primary: '#d4a853',
    accent: '#c9a227',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#f5f5f5',
    textMuted: '#a3a3a3',
  },
  fontPairings: {
    heading: 'Playfair Display',
    body: 'Inter',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600&display=swap',
  },
};
