import { apiClient } from '../api/axios';
import type { Product, ApiResponse } from '../types';
import { apiCache } from '../utils/cache';

export const productService = {
  getProducts: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Product>> => {
    const cacheKey = `products_${JSON.stringify(params || {})}`;
    const cached = apiCache.get<import('../types/api').PaginatedResponse<Product>>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<any>('/products', { params });
    apiCache.set(cacheKey, response.data.data);
    return response.data.data;
  },

  getProductsByCategory: async (categoryId: string | number): Promise<Product[]> => {
    const cacheKey = `products_category_${categoryId}`;
    const cached = apiCache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<ApiResponse<Product[]>>(`/products/category/${categoryId}`);
    apiCache.set(cacheKey, response.data.data!);
    return response.data.data!;
  },

  getRelatedProducts: async (productId: number | string): Promise<Product[]> => {
    const cacheKey = `products_related_${productId}`;
    const cached = apiCache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<ApiResponse<Product[]>>(`/products/${productId}/related`);
    apiCache.set(cacheKey, response.data.data!);
    return response.data.data!;
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const cacheKey = `product_${id}`;
    const cached = apiCache.get<ApiResponse<Product>>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    apiCache.set(cacheKey, response.data);
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
