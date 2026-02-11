import type { IndustryPromptData } from '../../types.js';

export const generalData: IndustryPromptData = {
  heroHeadline: 'Quality Service You Can Count On',
  heroSubtext:
    'Locally owned, community trusted. We bring professionalism, care, and real results to every customer we serve.',
  services: [
    {
      name: 'Free Consultation',
      price: 'Free',
      description: 'Tell us what you need and we\'ll provide an honest assessment and transparent quote.',
      icon: 'message-circle',
    },
    {
      name: 'Professional Service',
      price: 'Custom',
      description: 'Expert work delivered on time and on budget, backed by our satisfaction guarantee.',
      icon: 'star',
    },
    {
      name: 'Maintenance Plans',
      price: 'Varies',
      description: 'Keep things running smoothly with regular maintenance tailored to your needs.',
      icon: 'calendar',
    },
    {
      name: 'Emergency Support',
      price: 'Call Us',
      description: 'When you need help fast, we\'re here. Same-day service available for urgent requests.',
      icon: 'phone',
    },
  ],
  testimonials: [
    {
      text: 'Professional, punctual, and fairly priced. They did exactly what they said they would and the results speak for themselves. Highly recommend.',
      author: 'Mark D.',
      rating: 5,
    },
    {
      text: "I've tried several businesses in the area and this is the one I keep coming back to. Consistent quality and they actually care about their customers.",
      author: 'Susan K.',
      rating: 5,
    },
    {
      text: 'Called them for an emergency situation and they fit me in the same day. Fair price, great work, and genuinely kind people. Found my new go-to.',
      author: 'Chris B.',
      rating: 5,
    },
  ],
  aboutText:
    "We started this business with a simple goal: provide honest, quality service that our neighbors can rely on. Years later, that mission hasn't changed. Every job gets our full attention, every customer gets treated with respect, and every result meets the standards we'd expect for our own home or business.",
  ctaText: 'Get Started Today',
  colorPalette: {
    primary: '#2563eb',
    accent: '#3b82f6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#64748b',
  },
  fontPairings: {
    heading: 'Inter',
    body: 'Inter',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  },
};
