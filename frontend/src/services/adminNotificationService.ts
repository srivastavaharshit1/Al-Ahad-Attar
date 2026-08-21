import { apiClient } from '../api/axios';

export interface AdminNotification {
  id: number;
  message: string;
  type: string;
  orderId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AdminNotificationResponse {
  content: AdminNotification[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface AdminNotificationUnreadCountResponse {
  unreadCount: number;
}

export const adminNotificationService = {
  getRecentNotifications: async (page = 0, size = 50) => {
    const response = await apiClient.get<{ data: AdminNotificationResponse }>('/admin/notifications', {
      params: { page, size }
    });
    return response.data.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<{ data: AdminNotificationUnreadCountResponse }>('/admin/notifications/unread-count');
    return response.data.data;
  },

  markAsRead: async (id: number) => {
    const response = await apiClient.put(`/admin/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.put('/admin/notifications/read-all');
    return response.data;
  }
};
