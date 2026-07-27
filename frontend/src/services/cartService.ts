import { apiClient } from '../api/axios';
import type { ApiResponse } from '../types/api';

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  subtotal: number;
  itemDiscounts?: number;
  cartDiscount?: number;
  couponCode?: string | null;
  appliedPromotions?: any[];
  availablePromotions?: any[];
  lockedPromotions?: any[];
  unlockMessages?: string[];
  manuallySelectedPromotionId?: number | null;
  freeProductOptions?: any[];
}

export interface CartItemResponse {
  id: number;
  productId: number;
  variantId: number;
  name: string;
  image: string;
  size: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  finalPrice?: number;
  discountAmount?: number;
  freeItem?: boolean;
  freePromotionId?: number;
}

export const cartService = {
  getCart: async () => {
    const response = await apiClient.get<ApiResponse<CartResponse>>('/cart');
    return response.data;
  },

  addToCart: async (variantId: number, quantity: number) => {
    const response = await apiClient.post<ApiResponse<CartResponse>>('/cart/items', { variantId, quantity });
    return response.data;
  },

  updateQuantity: async (cartItemId: number, quantity: number) => {
    const response = await apiClient.put<ApiResponse<CartResponse>>(`/cart/items/${cartItemId}`, null, {
      params: { quantity }
    });
    return response.data;
  },

  removeFromCart: async (cartItemId: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/cart/items/${cartItemId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.delete<ApiResponse<void>>('/cart');
    return response.data;
  },

  applyCoupon: async (couponCode: string) => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(`/cart/coupon?couponCode=${encodeURIComponent(couponCode)}`);
    return response.data;
  },

  removeCoupon: async () => {
    const response = await apiClient.delete<ApiResponse<CartResponse>>('/cart/coupon');
    return response.data;
  },

  applyPromotion: async (promotionId: number) => {
    const response = await apiClient.post<ApiResponse<CartResponse>>(`/cart/promotions/${promotionId}`);
    return response.data;
  },

  removePromotion: async () => {
    const response = await apiClient.delete<ApiResponse<CartResponse>>('/cart/promotions');
    return response.data;
  },

  addFreeProduct: async (promotionId: number, variantId: number) => {
    const response = await apiClient.post<ApiResponse<CartResponse>>('/cart/free-product', { promotionId, variantId });
    return response.data;
  },

  removeFreeProduct: async (cartItemId: number) => {
    const response = await apiClient.delete<ApiResponse<CartResponse>>(`/cart/free-product/${cartItemId}`);
    return response.data;
  }
};
