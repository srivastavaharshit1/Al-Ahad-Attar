export type PromotionScope = 'ANY_PRODUCT' | 'CATEGORY' | 'SPECIFIC_PRODUCT';

export interface PromotionConfiguration {
  applicableCategoryIds: number[];
  applicableProductIds: number[];
  firstOrderOnly: boolean;
  buyScope?: PromotionScope | null;
  buyVariantSize?: string;
  buyVariantSizes?: string[];
  buyCategoryId?: number;
  buyProductId?: number;
  buyVariantIds?: number[];
  minPurchaseQuantity?: number;
  freeScope?: PromotionScope | null;
  freeCategoryIds?: number[];
  freeProductIds?: number[];
  freeVariantIds?: number[];
  allowedFreeVariantSize?: string;
  freeVariantSizes?: string[];
  maxFreeQuantity?: number;
  allowCustomerSelection?: boolean;
  autoAddFreeProduct?: boolean;
}

export interface PromotionResponse {
  id: number;
  name: string;
  description: string;
  code: string | null;
  promotionType: 'CART_DISCOUNT' | 'PRODUCT_DISCOUNT' | 'CATEGORY_DISCOUNT' | 'FREE_SHIPPING' | 'FIRST_ORDER' | 'BUNDLE' | 'FREE_PRODUCT';
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ITEM';
  discountValue: number;
  minCartValue: number;
  maxDiscountValue: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  priority: number;
  active: boolean;
  stackable: boolean;
  configuration: PromotionConfiguration | null;
  generatedDescription?: string | null;
}
