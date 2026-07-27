import { apiClient } from '../api/axios';
import type { ApiResponse } from '../types';

export interface GiftServiceItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GiftServiceRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  active: boolean;
  sortOrder: number;
}

export const giftServiceService = {
  // Public
  getActiveServices: async (): Promise<ApiResponse<GiftServiceItem[]>> => {
    const res = await apiClient.get<ApiResponse<GiftServiceItem[]>>('/gift-services/active');
    return res.data;
  },

  // Admin
  getAll: async (params?: { page?: number; size?: number; search?: string; sortBy?: string; sortDir?: string }): Promise<ApiResponse<any>> => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/gift-services', { params });
    return res.data;
  },

  getById: async (id: number): Promise<ApiResponse<GiftServiceItem>> => {
    const res = await apiClient.get<ApiResponse<GiftServiceItem>>(`/admin/gift-services/${id}`);
    return res.data;
  },

  create: async (data: GiftServiceRequest): Promise<ApiResponse<GiftServiceItem>> => {
    const res = await apiClient.post<ApiResponse<GiftServiceItem>>('/admin/gift-services', data);
    return res.data;
  },

  update: async (id: number, data: GiftServiceRequest): Promise<ApiResponse<GiftServiceItem>> => {
    const res = await apiClient.put<ApiResponse<GiftServiceItem>>(`/admin/gift-services/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete<ApiResponse<void>>(`/admin/gift-services/${id}`);
    return res.data;
  },

  toggle: async (id: number): Promise<ApiResponse<GiftServiceItem>> => {
    const res = await apiClient.patch<ApiResponse<GiftServiceItem>>(`/admin/gift-services/${id}/toggle`);
    return res.data;
  },

  uploadImage: async (file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<string>>('/admin/gift-services/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
};
