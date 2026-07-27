import { apiClient } from '../api/axios';
import type { ApiResponse, Variant } from '../types';

export interface WishlistItem {
  id: number;
  variant: Variant;
  createdAt: string;
}

export const wishlistService = {
  getWishlist: async (): Promise<ApiResponse<WishlistItem[]>> => {
    const response = await apiClient.get<ApiResponse<WishlistItem[]>>('/wishlist');
    return response.data;
  },

  addToWishlist: async (variantId: number): Promise<ApiResponse<WishlistItem>> => {
    const response = await apiClient.post<ApiResponse<WishlistItem>>(`/wishlist/${variantId}`);
    return response.data;
  },

  removeFromWishlist: async (variantId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/wishlist/${variantId}`);
    return response.data;
  }
};
