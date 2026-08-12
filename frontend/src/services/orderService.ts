import { apiClient } from '../api/axios';
import type { Order, ApiResponse, PaymentOrderResponse, OrderRequest } from '../types';

export const orderService = {
  createOrder: async (orderData: OrderRequest): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post<ApiResponse<Order>>('/orders', orderData);
    return response.data;
  },

  createPaymentOrder: async (couponCode?: string, giftServiceId?: number | null): Promise<PaymentOrderResponse> => {
    const payload: any = {};
    if (couponCode) payload.couponCode = couponCode;
    if (giftServiceId) payload.giftServiceId = giftServiceId;
    const response = await apiClient.post<PaymentOrderResponse>('/payment/create', payload);
    return response.data;
  },
  
  getOrders: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Order>> => {
    const response = await apiClient.get<any>('/orders', { params });
    return response.data.data;
  },
  
  getOrder: async (id: string): Promise<ApiResponse<Order>> => {
    const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return response.data;
  },
  
  getAllOrders: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Order>> => {
    const response = await apiClient.get<any>('/orders/all', { params });
    return response.data.data;
  },

  updateOrderStatus: async (id: string | number, status: string): Promise<ApiResponse<Order>> => {
    // Determine the action path segment based on status
    const getActionForStatus = (s: string) => {
      switch(s.toUpperCase()) {
        case 'CONFIRMED': return 'confirm';
        case 'PACKED': return 'pack';
        case 'SHIPPED': return 'ship';
        case 'DELIVERED': return 'deliver';
        case 'CANCELLED': return 'cancel';
        default: return null;
      }
    };
    
    const action = getActionForStatus(status);
    if (action) {
      const response = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/${action}`);
      return response.data;
    } else {
      const response = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, null, { params: { status } });
      return response.data;
    }
  },

  updateShippingDetails: async (id: string | number, payload: any): Promise<ApiResponse<Order>> => {
    const response = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/shipping`, payload);
    return response.data;
  },

  cancelOrder: async (id: string | number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/customer-cancel`);
    return response.data;
  },

  /**
   * Admin only: processes the full Razorpay refund for a cancelled, paid order. The frontend
   * sends only the order id — the backend derives the refund amount and payment reference itself
   * from trusted order data, never from anything the client supplies. Also used to "Retry Refund"
   * (same endpoint, backend distinguishes a fresh attempt from reconciling a stuck one).
   */
  initiateRefund: async (id: string | number): Promise<ApiResponse<Order>> => {
    const response = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/refund`);
    return response.data;
  },

  /** Admin refund-management listing: every order that has ever needed a refund. */
  getRefunds: async (params?: Record<string, any>): Promise<import('../types/api').PaginatedResponse<Order>> => {
    const response = await apiClient.get<any>('/orders/refunds', { params });
    return response.data.data;
  },
};

