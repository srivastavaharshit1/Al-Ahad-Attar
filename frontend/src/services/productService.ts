import { apiClient } from '../api/axios';
import type { Product, ApiResponse } from '../types';

export const productService = {
  getProducts: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Product>> => {
    const response = await apiClient.get<any>('/products', { params });
    return response.data.data;
  },

  getProductsByCategory: async (categoryId: string | number): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(`/products/category/${categoryId}`);
    return response.data.data!;
  },

  getRelatedProducts: async (productId: number | string): Promise<Product[]> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(`/products/${productId}/related`);
    return response.data.data!;
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  searchProducts: async (query: string): Promise<import('../types/api').PaginatedResponse<Product>> => {
    const response = await apiClient.get<any>(`/products`, { params: { search: query } });
    return response.data.data;
  },

  // Admin Methods
  createProduct: async (productData: any): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post<ApiResponse<Product>>('/products', productData);
    return response.data;
  },

  updateProduct: async (id: string | number, productData: any): Promise<ApiResponse<Product>> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: string | number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/${id}`);
    return response.data;
  }
};
