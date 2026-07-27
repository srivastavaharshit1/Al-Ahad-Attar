import { apiClient } from '../api/axios';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export interface ContactMessage {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    inquiryType: string;
    message: string;
    status: 'UNREAD' | 'READ' | 'REPLIED';
    createdAt: string;
}

export interface ContactMessageRequest {
    firstName: string;
    lastName: string;
    email: string;
    inquiryType: string;
    message: string;
}

export const contactService = {
    submitInquiry: async (request: ContactMessageRequest) => {
        const response = await apiClient.post<ApiResponse<ContactMessage>>('/contact/submit', request);
        return response.data;
    },
    
    getAllInquiries: async (params?: { page?: number; size?: number; status?: string; inquiryType?: string }) => {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<ContactMessage>>>('/admin/contact', { params });
        return response.data.data;
    },
    
    updateStatus: async (id: number, status: 'UNREAD' | 'READ' | 'REPLIED') => {
        const response = await apiClient.put<ApiResponse<ContactMessage>>(`/admin/contact/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },
    
    deleteInquiry: async (id: number) => {
        const response = await apiClient.delete<ApiResponse<void>>(`/admin/contact/${id}`);
        return response.data;
    }
};
