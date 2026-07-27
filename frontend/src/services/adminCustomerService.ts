import { apiClient } from '../api/axios';

export interface CustomerListResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationDate: string;
  totalOrders: number;
  lifetimeSpending: number;
  active: boolean;
}

export const adminCustomerService = {
  getCustomers: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<CustomerListResponse>> => {
    const response = await apiClient.get<any>('/admin/customers', { params });
    return response.data.data;
  }
};
