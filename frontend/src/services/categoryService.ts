import { apiClient } from '../api/axios';
import type { Category, ApiResponse } from '../types';

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
    const response = await apiClient.get<any>('/categories', { params });
    return response.data.data;
  },
  
  getActiveCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories/active');
    return response.data;
  },

  getCategory: async (id: string): Promise<ApiResponse<Category>> => {
    const response = await apiClient.get<ApiResponse<Category>>(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (data: CategoryRequest): Promise<ApiResponse<Category>> => {
    const response = await apiClient.post<ApiResponse<Category>>('/categories', data);
    return response.data;
  },

  updateCategory: async (id: number, data: CategoryRequest): Promise<ApiResponse<Category>> => {
    const response = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/categories/${id}`);
    return response.data;
  },

  uploadDesktopImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/desktop-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadMobileImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/mobile-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadHoverImage: async (id: number, file: File): Promise<ApiResponse<Category>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<Category>>(`/categories/${id}/hover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
};
