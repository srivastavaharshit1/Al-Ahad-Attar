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


export interface TopProductStat {
  productName: string;
  unitsSold: number;
  revenue: number;
}

export interface TopCategoryStat {
  categoryName: string;
  revenue: number;
  orderCount: number;
}

export interface LowStockItem {
  productName: string;
  size: string;
  stock: number;
}

export interface AnalyticsData {
  topProducts: TopProductStat[];
  topCategories: TopCategoryStat[];
  lowStockItems: LowStockItem[];
  lowStockThreshold: number;
}

export const dashboardService = {
  // Fans out ~17 queries backend-side through a 4-connection-capped pool (kept below Hikari's
  // 5-connection ceiling), so it runs in ~5 sequential DB round-trip batches — comfortably under
  // the default 10s client timeout most of the time, but occasional latency pushes it over,
  // aborting the request client-side before the backend would've actually responded.
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats', { timeout: 25000 });
    return response.data;
  },

  getAnalytics: async (): Promise<ApiResponse<AnalyticsData>> => {
    const response = await apiClient.get<ApiResponse<AnalyticsData>>('/admin/dashboard/analytics', { timeout: 25000 });
    return response.data;
  }
};
