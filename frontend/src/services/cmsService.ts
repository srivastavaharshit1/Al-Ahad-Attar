import { apiClient as api } from '../api/axios';

export interface CmsPage {
  pageKey: string;
  contentJson: string;
  updatedAt: string;
}

export const cmsService = {
  getPublicPage: (pageKey: string) => {
    return api.get<CmsPage>(`/public/cms/${pageKey}`);
  },

  getAdminPage: (pageKey: string) => {
    return api.get<CmsPage>(`/admin/cms/${pageKey}`);
  },

  updatePage: (pageKey: string, contentJson: string) => {
    return api.put<CmsPage>(`/admin/cms/${pageKey}`, { contentJson });
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/admin/cms/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.url;
  }
};
