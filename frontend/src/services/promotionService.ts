import { apiClient } from '../api/axios';

export const promotionService = {
  getPromotions: async () => {
    const response = await apiClient.get<any>('/admin/promotions');
    return response.data;
  },
  
  createPromotion: async (payload: any) => {
    const response = await apiClient.post<any>('/admin/promotions', payload);
    return response.data;
  },

  updatePromotion: async (id: number, payload: any) => {
    const response = await apiClient.put<any>(`/admin/promotions/${id}`, payload);
    return response.data;
  },
  
  updatePromotionStatus: async (id: number, active: boolean) => {
    const response = await apiClient.patch<any>(`/admin/promotions/${id}/status?active=${active}`);
    return response.data;
  },
  
  deletePromotion: async (id: number) => {
    const response = await apiClient.delete<any>(`/admin/promotions/${id}`);
    return response.data;
  }
};
