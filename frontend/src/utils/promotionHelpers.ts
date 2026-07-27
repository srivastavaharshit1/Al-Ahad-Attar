import type { PromotionResponse } from '../types/promotion';

/**
 * Returns a contextual emoji icon for a promotion type.
 */
export const getPromoIcon = (promo: PromotionResponse): string => {
  switch (promo.promotionType) {
    case 'FREE_SHIPPING': return '🚚';
    case 'FREE_PRODUCT': return '🎁';
    case 'FIRST_ORDER': return '✨';
    case 'CART_DISCOUNT':
    case 'CATEGORY_DISCOUNT':
    case 'PRODUCT_DISCOUNT':
      return promo.discountType === 'PERCENTAGE' ? '💎' : '💰';
    default: return '🏷️';
  }
};

/**
 * Returns a short, punchy headline for the announcement bar.
 */
export const getPromoHeadline = (promo: PromotionResponse): string => {
  switch (promo.promotionType) {
    case 'FREE_SHIPPING':
      return promo.minCartValue > 0
        ? `Free Shipping Above ₹${promo.minCartValue}`
        : 'Free Shipping on All Orders';
    case 'FREE_PRODUCT': {
      return `Free Gift Included`;
    }
    case 'FIRST_ORDER':
      return promo.discountType === 'PERCENTAGE'
        ? `${promo.discountValue}% Off Your First Order`
        : `₹${promo.discountValue} Off Your First Order`;
    case 'CART_DISCOUNT':
    case 'CATEGORY_DISCOUNT':
    case 'PRODUCT_DISCOUNT':
      if (promo.discountType === 'PERCENTAGE') {
        return promo.minCartValue > 0
          ? `${promo.discountValue}% Off Above ₹${promo.minCartValue}`
          : `${promo.discountValue}% Off`;
      }
      return promo.minCartValue > 0
        ? `₹${promo.discountValue} Off Above ₹${promo.minCartValue}`
        : `₹${promo.discountValue} Off`;
    default:
      return promo.name;
  }
};

/**
 * Returns a short badge label for product cards.
 */
export const getPromoBadge = (promo: PromotionResponse): string => {
  if (promo.promotionType === 'FREE_PRODUCT') {
    return `FREE GIFT`;
  }
  if (promo.promotionType === 'FREE_SHIPPING') return 'FREE SHIPPING';
  if (promo.promotionType === 'FIRST_ORDER') return 'FIRST ORDER';
  if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}% OFF`;
  if (promo.discountType === 'FIXED_AMOUNT') return `₹${promo.discountValue} OFF`;
  return 'SPECIAL OFFER';
};

/**
 * Returns remaining days until a date, or null if no date.
 */
export const getDaysRemaining = (endDate: string | null): number | null => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
};

/**
 * Estimates savings for a promotion to help identify the "Best Value" offer.
 */
export const estimateSavings = (promo: PromotionResponse, subtotal: number): number => {
  if (promo.minCartValue && subtotal < promo.minCartValue) return 0;
  if (promo.promotionType === 'FREE_SHIPPING') return 50; // Estimated shipping cost
  
  if (promo.discountType === 'PERCENTAGE') {
    let savings = subtotal * (promo.discountValue / 100);
    if (promo.maxDiscountValue && promo.maxDiscountValue > 0) {
      savings = Math.min(savings, promo.maxDiscountValue);
    }
    return savings;
  } else if (promo.discountType === 'FIXED_AMOUNT') {
    return promo.discountValue;
  }
  
  // FREE_PRODUCT, fallback
  if (promo.promotionType === 'FREE_PRODUCT') return 100;
  
  return 0;
};
