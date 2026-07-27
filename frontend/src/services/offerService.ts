import { apiClient } from '../api/axios';

export const offerService = {
  getOffers: async (params?: Record<string, any>) => {
    const response = await apiClient.get<any>('/offers', { params });
    return response.data;
  }
};
