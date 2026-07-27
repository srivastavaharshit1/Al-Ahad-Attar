import { apiClient } from '../api/axios';
import type { ApiResponse } from '../types';

export interface ProductImage {
  id: number;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  displayOrder: number;
  imageType: 'THUMBNAIL' | 'GALLERY' | 'HERO';
  active: boolean;
}

export const imageService = {
  getImagesByVariant: async (variantId: number) => {
    const response = await apiClient.get<ApiResponse<ProductImage[]>>(`/variants/${variantId}/images`);
    return response.data;
  },

  uploadImage: async (variantId: number, file: File, imageType: 'THUMBNAIL' | 'GALLERY' | 'HERO' = 'GALLERY') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', imageType);
    
    const response = await apiClient.post<ApiResponse<ProductImage>>(`/variants/${variantId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  deleteImage: async (id: number) => {
    const response = await apiClient.delete<ApiResponse<void>>(`/images/${id}`);
    return response.data;
  },

  setAsThumbnail: async (id: number) => {
    const response = await apiClient.patch<ApiResponse<ProductImage>>(`/images/${id}/thumbnail`);
    return response.data;
  },

  updateDisplayOrder: async (id: number, displayOrder: number) => {
    const response = await apiClient.patch<ApiResponse<ProductImage>>(`/images/${id}/display-order`, null, {
      params: { displayOrder }
    });
    return response.data;
  }
};
