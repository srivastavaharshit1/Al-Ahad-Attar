import { apiClient } from '../api/axios';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { GiftSet, GiftSetRequest, GiftSetImage } from '../types/giftSet';
import { apiCache } from '../utils/cache';

export const giftSetService = {
  /**
   * Fetch all active gift sets for storefront
   */
  getAllGiftSets: async (): Promise<GiftSet[]> => {
    const response = await apiClient.get<ApiResponse<GiftSet[]>>('/gift-sets');
    return response.data.data;
  },

  /**
   * Fetch featured gift sets for homepage showcase
   */
  getFeaturedGiftSets: async (): Promise<GiftSet[]> => {
    const response = await apiClient.get<ApiResponse<GiftSet[]>>('/gift-sets/featured');
    return response.data.data;
  },

  /**
   * Fetch a single gift set by slug for customer storefront
   */
  getGiftSetBySlug: async (slug: string): Promise<GiftSet> => {
    const response = await apiClient.get<ApiResponse<GiftSet>>(`/gift-sets/${slug}`);
    return response.data.data;
  },

  /**
   * Fetch paginated gift sets for admin management
   */
  getAdminGiftSets: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<PaginatedResponse<GiftSet>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<GiftSet>>>('/admin/gift-sets', { params });
    return response.data.data;
  },

  /**
   * Fetch a single gift set by ID
   */
  getAdminGiftSetById: async (id: number | string): Promise<GiftSet> => {
    const response = await apiClient.get<ApiResponse<GiftSet>>(`/admin/gift-sets/${id}`);
    return response.data.data;
  },

  /**
   * Create a new gift set
   */
  createGiftSet: async (data: GiftSetRequest): Promise<GiftSet> => {
    const response = await apiClient.post<ApiResponse<GiftSet>>('/admin/gift-sets', data);
    apiCache.clear();
    return response.data.data;
  },

  /**
   * Update an existing gift set
   */
  updateGiftSet: async (id: number | string, data: GiftSetRequest): Promise<GiftSet> => {
    const response = await apiClient.put<ApiResponse<GiftSet>>(`/admin/gift-sets/${id}`, data);
    apiCache.clear();
    return response.data.data;
  },

  /**
   * Deactivate/archive a gift set
   */
  deleteGiftSet: async (id: number | string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/admin/gift-sets/${id}`);
    apiCache.clear();
  },

  /**
   * Toggle active status of a gift set
   */
  toggleStatus: async (id: number | string, active: boolean): Promise<GiftSet> => {
    const response = await apiClient.patch<ApiResponse<GiftSet>>(`/admin/gift-sets/${id}/status`, null, {
      params: { active },
    });
    apiCache.clear();
    return response.data.data;
  },

  /**
   * Upload an image for a gift set
   */
  uploadImage: async (giftSetId: number | string, file: File): Promise<GiftSetImage> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<GiftSetImage>>(
      `/admin/gift-sets/${giftSetId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
    );
    apiCache.clear();
    return response.data.data;
  },

  /**
   * Delete an image of a gift set
   */
  deleteImage: async (imageId: number | string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/admin/gift-sets/images/${imageId}`);
    apiCache.clear();
  },

  /**
   * Set image as primary for a gift set
   */
  setPrimaryImage: async (imageId: number | string): Promise<GiftSetImage> => {
    const response = await apiClient.put<ApiResponse<GiftSetImage>>(`/admin/gift-sets/images/${imageId}/primary`);
    apiCache.clear();
    return response.data.data;
  },

  /**
   * Reorder images for a gift set
   */
  reorderImages: async (giftSetId: number | string, imageIds: number[]): Promise<GiftSetImage[]> => {
    const response = await apiClient.put<ApiResponse<GiftSetImage[]>>(
      `/admin/gift-sets/${giftSetId}/images/reorder`,
      imageIds
    );
    apiCache.clear();
    return response.data.data;
  },
};

