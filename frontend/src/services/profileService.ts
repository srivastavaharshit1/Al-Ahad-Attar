import { apiClient } from '../api/axios';
import type { User, Address, AddressRequest, ApiResponse, ChangePasswordRequest } from '../types';

export const profileService = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>('/profile');
    return response.data;
  },
  
  updateProfile: async (data: { firstName: string; lastName: string; phone: string }): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>('/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.patch<ApiResponse<void>>('/profile/change-password', data);
    return response.data;
  },

  getAddresses: async (): Promise<ApiResponse<Address[]>> => {
    const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
    return response.data;
  },

  getAddress: async (id: number): Promise<ApiResponse<Address>> => {
    const response = await apiClient.get<ApiResponse<Address>>(`/addresses/${id}`);
    return response.data;
  },

  addAddress: async (data: AddressRequest): Promise<ApiResponse<Address>> => {
    const response = await apiClient.post<ApiResponse<Address>>('/addresses', data);
    return response.data;
  },

  updateAddress: async (id: number, data: AddressRequest): Promise<ApiResponse<Address>> => {
    const response = await apiClient.put<ApiResponse<Address>>(`/addresses/${id}`, data);
    return response.data;
  },

  deleteAddress: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/addresses/${id}`);
    return response.data;
  },

  setDefaultAddress: async (id: number): Promise<ApiResponse<Address>> => {
    const response = await apiClient.patch<ApiResponse<Address>>(`/addresses/${id}/default`);
    return response.data;
  }
};
