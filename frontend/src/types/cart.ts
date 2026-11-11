import type { Product } from './product';

export interface GiftSetComponentInfo {
  id?: number;
  productId?: number;
  productName?: string;
  variantId?: number;
  variantSize?: string;
  sku?: string;
  quantity?: number;
}

export interface CartItem {
  id: string;
  productId?: string;
  variantId?: string | number;
  quantity: number;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;

  product?: Product;
  name?: string;
  image?: string;
  size?: string;
  freeItem?: boolean;
  freePromotionId?: number;

  bottle?: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
  };

  isGiftSet?: boolean;
  giftSetId?: number;
  giftSetName?: string;
  includedItems?: GiftSetComponentInfo[];
}

export interface Wishlist {
  userId: string;
  productIds: string[];
}
