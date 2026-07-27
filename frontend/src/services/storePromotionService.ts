import { apiClient } from '../api/axios';
import type { PromotionResponse } from '../types/promotion';

export const storePromotionService = {
  getActivePromotions: async (): Promise<PromotionResponse[]> => {
    const response = await apiClient.get<any>('/promotions/active');
    return response.data.data;
  }
};
