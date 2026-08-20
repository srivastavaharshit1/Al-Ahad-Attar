import { apiClient } from '../api/axios';
import type { User, ApiResponse, LoginCredentials, RegisterData } from '../types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Currently stateless JWT, so we just clear local storage on the client side.
    return Promise.resolve();
  },

  forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  googleLogin: async (idToken: string, phone?: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/google', { idToken, phone });
    return response.data;
  }
};
