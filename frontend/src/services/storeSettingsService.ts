import { apiClient } from '../api/axios';
import type { ApiResponse } from '../types/api';

export interface StoreSettings {
    brandLogoUrl?: string;
    navbarLogoUrl?: string;
    storeName?: string;
    whatsappNumber?: string;
    instagramHandle?: string;
    shippingCharge?: number;
    freeShippingThreshold?: number;
    privacyPolicy?: string;
    termsOfService?: string;
    returnPolicy?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    phoneNumber?: string;
    emailAddress?: string;
    businessHours?: string;
    mapEmbedUrl?: string;
    isAnnouncementBarActive?: boolean;
    customAnnouncementText?: string;
    isGiftWrapEnabled?: boolean;
    giftWrapPrice?: number;
}

export const storeSettingsService = {
    getSettings: async () => {
        const response = await apiClient.get<ApiResponse<StoreSettings>>('/settings');
        return response.data;
    },
    updateSettings: async (settings: StoreSettings) => {
        const response = await apiClient.put<ApiResponse<StoreSettings>>('/settings', settings);
        return response.data;
    },
    uploadLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ApiResponse<string>>('/settings/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },
    uploadNavbarLogo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ApiResponse<string>>('/settings/logo/navbar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
