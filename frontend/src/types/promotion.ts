export interface PromotionConfiguration {
  applicableCategoryIds: number[];
  applicableProductIds: number[];
  firstOrderOnly: boolean;
  buyVariantSize?: string;
  buyCategoryId?: number;
  buyProductId?: number;
  minPurchaseQuantity?: number;
  freeCategoryIds?: number[];
  freeProductIds?: number[];
  allowedFreeVariantSize?: string;
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
}
