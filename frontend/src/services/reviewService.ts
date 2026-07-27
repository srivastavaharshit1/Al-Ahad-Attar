import { apiClient } from '../api/axios';
import type { ApiResponse, PaginatedResponse, Review, ReviewSummary, ReviewRequest, ReportReviewRequest } from '../types';

export const reviewService = {
  // --- Customer Endpoints ---
  
  getProductReviews: async (productId: number | string, params?: Record<string, any>): Promise<PaginatedResponse<Review>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Review>>>(`/reviews/product/${productId}`, { params });
    return response.data.data!;
  },

  getProductReviewSummary: async (productId: number | string): Promise<ReviewSummary> => {
    const response = await apiClient.get<ApiResponse<ReviewSummary>>(`/reviews/product/${productId}/summary`);
    return response.data.data!;
  },

  createReview: async (data: ReviewRequest): Promise<Review> => {
    const response = await apiClient.post<ApiResponse<Review>>('/reviews', data);
    return response.data.data!;
  },

  updateReview: async (id: number | string, data: ReviewRequest): Promise<Review> => {
    const response = await apiClient.put<ApiResponse<Review>>(`/reviews/${id}`, data);
    return response.data.data!;
  },

  deleteReview: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  uploadImages: async (id: number | string, images: File[]): Promise<Review> => {
    const formData = new FormData();
    images.forEach(img => formData.append('images', img));
    const response = await apiClient.post<ApiResponse<Review>>(`/reviews/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  toggleHelpful: async (id: number | string): Promise<Review> => {
    const response = await apiClient.post<ApiResponse<Review>>(`/reviews/${id}/helpful`);
    return response.data.data!;
  },

  reportReview: async (id: number | string, data: ReportReviewRequest): Promise<void> => {
    await apiClient.post(`/reviews/${id}/report`, data);
  },

  // --- Admin Endpoints ---

  getAllReviews: async (params?: Record<string, any>): Promise<PaginatedResponse<Review>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Review>>>('/admin/reviews', { params });
    return response.data.data!;
  },

  toggleVisibility: async (id: number | string, hide: boolean): Promise<Review> => {
    const response = await apiClient.patch<ApiResponse<Review>>(`/admin/reviews/${id}/visibility`, { hide });
    return response.data.data!;
  },

  adminReply: async (id: number | string, reply: string): Promise<Review> => {
    const response = await apiClient.patch<ApiResponse<Review>>(`/admin/reviews/${id}/reply`, { reply });
    return response.data.data!;
  },

  adminDeleteReview: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/admin/reviews/${id}`);
  }
};
