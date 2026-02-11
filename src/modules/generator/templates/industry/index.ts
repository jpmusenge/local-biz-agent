import type { IndustryCategory, IndustryPromptData } from '../../types.js';
import { barberShopData } from './barber-shop.js';
import { restaurantData } from './restaurant.js';
import { autoRepairData } from './auto-repair.js';
import { salonData } from './salon.js';
import { generalData } from './general.js';

export { barberShopData } from './barber-shop.js';
export { restaurantData } from './restaurant.js';
export { autoRepairData } from './auto-repair.js';
export { salonData } from './salon.js';
export { generalData } from './general.js';

const industryMap: Record<IndustryCategory, IndustryPromptData> = {
  barber_shop: barberShopData,
  restaurant: restaurantData,
  auto_repair: autoRepairData,
  salon: salonData,
  general: generalData,
};

/**
 * Detect the industry category from a business type string.
 */
export function detectIndustryCategory(businessType: string): IndustryCategory {
  const type = businessType.toLowerCase();

  if (type.includes('barber')) return 'barber_shop';
  if (type.includes('restaurant') || type.includes('food') || type.includes('cafe') || type.includes('dining'))
    return 'restaurant';
  if (type.includes('auto') || type.includes('repair') || type.includes('mechanic') || type.includes('garage'))
    return 'auto_repair';
  if (type.includes('salon') || type.includes('beauty') || type.includes('spa') || type.includes('hair'))
    return 'salon';

  return 'general';
}

/**
 * Get industry-specific prompt data for a business type.
 */
export function getIndustryData(businessType: string): IndustryPromptData {
  const category = detectIndustryCategory(businessType);
  return industryMap[category];
}
