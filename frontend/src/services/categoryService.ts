import { apiClient } from '../api/axios';
import type { Category, ApiResponse } from '../types';
import { apiCache } from '../utils/cache';

export interface CategoryRequest {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  type: string;
  active?: boolean;
  homepageTitle?: string | null;
  homepageSubtitle?: string | null;
  homepageButtonText?: string | null;
  homepageButtonUrl?: string | null;
  showOnHomepage?: boolean;
  homepageDisplayOrder?: number;
}

export const categoryService = {
  getCategories: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Category>> => {
    const cacheKey = `categories_${JSON.stringify(params || {})}`;
    const cached = apiCache.get<import('../types/api').PaginatedResponse<Category>>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<any>('/categories', { params });
    apiCache.set(cacheKey, response.data.data);
    return response.data.data;
  },
  
  getActiveCategories: async (): Promise<ApiResponse<Category[]>> => {
    const cacheKey = `active_categories`;
    const cached = apiCache.get<ApiResponse<Category[]>>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<ApiResponse<Category[]>>('/categories/active');
    apiCache.set(cacheKey, response.data);
    return response.data;
  },

  getCategory: async (id: string): Promise<ApiResponse<Category>> => {
    const cacheKey = `category_${id}`;
    const cached = apiCache.get<ApiResponse<Category>>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    apiCache.set(cacheKey, response.data);
    return response.data;
  },

  createCategory: async (data: CategoryRequest): Promise<ApiResponse<Category>> => {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
    apiCache.clear();
    return response.data;
  },

  updateCategory: async (id: number, data: CategoryRequest): Promise<ApiResponse<Category>> => {
    const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    apiCache.clear();
    return response.data;
  },

  deleteCategory: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/categories/${id}`);
    apiCache.clear();
    return response.data;
  },

  uploadDesktopImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/desktop-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data;
  },

  uploadMobileImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/mobile-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data;
  },

  uploadHoverImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/hover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data;
  }
};
