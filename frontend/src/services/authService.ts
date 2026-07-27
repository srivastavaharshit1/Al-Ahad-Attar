import { apiClient } from '../api/axios';
import type { User, ApiResponse } from '../types';

export const authService = {
  login: async (credentials: any): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: any): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Currently stateless JWT, so we just clear local storage on the client side.
    return Promise.resolve();
  }
};
