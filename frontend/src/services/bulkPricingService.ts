import { apiClient } from '../api/axios';

export type BulkPricingScope = 'UNIVERSAL' | 'CATEGORY';
export type BulkPricingOperation = 'INCREASE' | 'DECREASE' | 'SET';
export type BulkPricingType = 'PERCENTAGE' | 'FIXED';

export interface BulkPricingRequest {
    scope: BulkPricingScope;
    categoryId?: number;
    subcategory?: string;
    operation: BulkPricingOperation;
    size?: string;
    type: BulkPricingType;
    value: number;
    idempotencyKey?: string;
    productTypeFilter?: string;
}

export interface BulkPricingPreviewItem {
    productName: string;
    variantSize: string;
    oldPrice: number;
    newPrice: number;
}

export interface BulkPricingPreviewResponse {
    productsAffected: number;
    currentTotalValue: number;
    newTotalValue: number;
    examples: BulkPricingPreviewItem[];
}

export interface BulkPricingApplyResponse {
    success: boolean;
    productsAffected: number;
    message: string;
}

export interface BulkPriceAudit {
    id: number;
    adminId: number;
    adminEmail: string;
    scope: BulkPricingScope;
    categoryId?: number;
    categoryName?: string;
    operation: BulkPricingOperation;
    type: BulkPricingType;
    value: number;
    productsAffected: number;
    timestamp: string;
    status: 'SUCCESS' | 'FAILED';
}

export const bulkPricingService = {
    preview: async (request: BulkPricingRequest) => {
        const response = await apiClient.post<ApiResponse<BulkPricingPreviewResponse>>('/admin/products/pricing/preview', request, {
            timeout: 0 // Disable timeout for heavy operations
        });
        return response.data;
    },

    apply: async (request: BulkPricingRequest) => {
        const response = await apiClient.post<ApiResponse<BulkPricingApplyResponse>>('/admin/products/pricing/apply', request, {
            timeout: 0 // Disable timeout for heavy operations
        });
        return response.data;
    },

    getHistory: async () => {
        const response = await apiClient.get<ApiResponse<BulkPriceAudit[]>>('/admin/products/pricing/history');
        return response.data;
    }
};

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}
