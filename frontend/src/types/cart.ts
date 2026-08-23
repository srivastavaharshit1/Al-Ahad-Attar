import type { Product } from './product';

export interface CartItem {
  id: string;
  productId: string;
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
}

export interface Wishlist {
  userId: string;
  productIds: string[];
}
