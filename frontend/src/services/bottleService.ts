import { apiClient as api } from '../api/axios';

export interface Bottle {
    id: number;
    name: string;
    description?: string;
    price: number;
    capacity?: string;
    imageUrl?: string;
    active: boolean;
}

export interface BottleRequest {
    name: string;
    description?: string;
    price: number;
    capacity?: string;
    imageUrl?: string;
    active: boolean;
}

export const bottleService = {
    getAll: async () => {
        const response = await api.get<Bottle[]>('/bottles');
        return response.data;
    },

    getActive: async () => {
        const response = await api.get<Bottle[]>('/bottles/public/active');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get<Bottle>(`/bottles/${id}`);
        return response.data;
    },

    create: async (data: BottleRequest) => {
        const response = await api.post<Bottle>('/bottles', data);
        return response.data;
    },

    update: async (id: number, data: BottleRequest) => {
        const response = await api.put<Bottle>(`/bottles/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/bottles/${id}`);
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<string>('/bottles/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    }
};
