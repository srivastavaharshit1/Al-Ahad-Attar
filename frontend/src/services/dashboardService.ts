import { apiClient } from '../api/axios';
import type { ApiResponse, Order } from '../types';

export interface ChartData {
  month: string;
  revenue: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  todaysRevenue: number;
  confirmedOrders: number;
  packedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  monthlyRevenue: ChartData[];
  recentOrders: Order[];
  pendingRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
  totalRefunded: number;
}


export const dashboardService = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
    return response.data;
  }
};
