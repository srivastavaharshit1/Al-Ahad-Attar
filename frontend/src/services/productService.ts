import { apiClient } from '../api/axios';
import type { Product, ApiResponse } from '../types';
import { apiCache } from '../utils/cache';

const inFlightRequests = new Map<string, Promise<any>>();

export const productService = {
  getProducts: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Product>> => {
    const cacheKey = `products_${JSON.stringify(params || {})}`;
    const cached = apiCache.get<import('../types/api').PaginatedResponse<Product>>(cacheKey);
    if (cached) return cached;

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = apiClient.get<any>('/products', { params })
      .then(response => {
        apiCache.set(cacheKey, response.data.data);
        return response.data.data;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  getProductsByCategory: async (categoryId: string | number): Promise<Product[]> => {
    const cacheKey = `products_category_${categoryId}`;
    const cached = apiCache.get<Product[]>(cacheKey);
    if (cached) return cached;

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = apiClient.get<ApiResponse<Product[]>>(`/products/category/${categoryId}`)
      .then(response => {
        apiCache.set(cacheKey, response.data.data!);
        return response.data.data!;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  getRelatedProducts: async (productId: number | string): Promise<Product[]> => {
    const cacheKey = `products_related_${productId}`;
    const cached = apiCache.get<Product[]>(cacheKey);
    if (cached) return cached;

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = apiClient.get<ApiResponse<Product[]>>(`/products/${productId}/related`)
      .then(response => {
        apiCache.set(cacheKey, response.data.data!);
        return response.data.data!;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  getProduct: async (id: string): Promise<ApiResponse<Product>> => {
    const cacheKey = `product_${id}`;
    const cached = apiCache.get<ApiResponse<Product>>(cacheKey);
    if (cached) return cached;

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = apiClient.get<ApiResponse<Product>>(`/products/${id}`)
      .then(response => {
        apiCache.set(cacheKey, response.data);
        return response.data;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  searchProducts: async (query: string): Promise<import('../types/api').PaginatedResponse<Product>> => {
    const cacheKey = `products_search_${query}`;
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = apiClient.get<any>(`/products`, { params: { search: query } })
      .then(response => response.data.data)
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  // Admin Methods
  createProduct: async (productData: any): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post<ApiResponse<Product>>('/products', productData);
    apiCache.clear();
    return response.data;
  },

  updateProduct: async (id: string | number, productData: any): Promise<ApiResponse<Product>> => {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, productData);
    apiCache.clear();
    return response.data;
  },

  deleteProduct: async (id: string | number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/${id}`);
    apiCache.clear();
    return response.data;
  }
};
