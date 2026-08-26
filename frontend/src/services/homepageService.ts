import { apiClient } from '../api/axios';
import type { 
  HomepageDataResponse, 
  HomepageSectionResponse, 
  HomepageSectionRequest,
  HeroBannerResponse,
  HeroBannerRequest,
  PromoBannerResponse,
  PromoBannerRequest,
  TestimonialResponse,
  TestimonialRequest,
  WhyChooseUsItemResponse,
  WhyChooseUsItemRequest,
  ReorderRequest
} from '../types/homepage';

import { apiCache } from '../utils/cache';

const PUBLIC_API = '/homepage';
const ADMIN_API = '/admin/homepage';

export const homepageService = {
  // --- Public API ---
  getHomepageData: async (): Promise<HomepageDataResponse> => {
    const cacheKey = `homepage_data`;
    const cached = apiCache.get<HomepageDataResponse>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get(PUBLIC_API);
    apiCache.set(cacheKey, response.data.data);
    return response.data.data;
  },

  // --- Admin Sections ---
  getAllSections: async (): Promise<HomepageSectionResponse[]> => {
    const response = await apiClient.get(`${ADMIN_API}/sections`);
    return response.data.data;
  },

  updateSection: async (sectionKey: string, request: HomepageSectionRequest): Promise<HomepageSectionResponse> => {
    const response = await apiClient.put(`${ADMIN_API}/sections/${sectionKey}`, request);
    apiCache.clear();
    return response.data.data;
  },

  reorderSections: async (requests: ReorderRequest[]): Promise<void> => {
    await apiClient.patch(`${ADMIN_API}/sections/reorder`, requests);
    apiCache.clear();
  },

  uploadSectionImage: async (sectionKey: string, file: File): Promise<HomepageSectionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${ADMIN_API}/sections/${sectionKey}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    apiCache.clear();
    return response.data.data;
  },

  // --- Admin Hero Banners ---
  getAllHeroBanners: async (): Promise<HeroBannerResponse[]> => {
    const response = await apiClient.get(`${ADMIN_API}/heroes`);
    return response.data.data;
  },

  createHeroBanner: async (request: HeroBannerRequest): Promise<HeroBannerResponse> => {
    const response = await apiClient.post(`${ADMIN_API}/heroes`, request);
    apiCache.clear();
    return response.data.data;
  },

  updateHeroBanner: async (id: number, request: HeroBannerRequest): Promise<HeroBannerResponse> => {
    const response = await apiClient.put(`${ADMIN_API}/heroes/${id}`, request);
    apiCache.clear();
    return response.data.data;
  },

  deleteHeroBanner: async (id: number): Promise<void> => {
    await apiClient.delete(`${ADMIN_API}/heroes/${id}`);
    apiCache.clear();
  },

  reorderHeroBanners: async (requests: ReorderRequest[]): Promise<void> => {
    await apiClient.patch(`${ADMIN_API}/heroes/reorder`, requests);
    apiCache.clear();
  },

  uploadHeroImage: async (id: number, file: File, isMobile: boolean = false): Promise<HeroBannerResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = isMobile ? 'mobile-image' : 'image';
    const response = await apiClient.post(`${ADMIN_API}/heroes/${id}/${endpoint}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data.data;
  },

  // --- Admin Promo Banners ---
  getAllPromoBanners: async (): Promise<PromoBannerResponse[]> => {
    const response = await apiClient.get(`${ADMIN_API}/banners`);
    return response.data.data;
  },

  createPromoBanner: async (request: PromoBannerRequest): Promise<PromoBannerResponse> => {
    const response = await apiClient.post(`${ADMIN_API}/banners`, request);
    apiCache.clear();
    return response.data.data;
  },

  updatePromoBanner: async (id: number, request: PromoBannerRequest): Promise<PromoBannerResponse> => {
    const response = await apiClient.put(`${ADMIN_API}/banners/${id}`, request);
    apiCache.clear();
    return response.data.data;
  },

  deletePromoBanner: async (id: number): Promise<void> => {
    await apiClient.delete(`${ADMIN_API}/banners/${id}`);
    apiCache.clear();
  },

  reorderPromoBanners: async (requests: ReorderRequest[]): Promise<void> => {
    await apiClient.patch(`${ADMIN_API}/banners/reorder`, requests);
    apiCache.clear();
  },

  uploadPromoImage: async (id: number, file: File): Promise<PromoBannerResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${ADMIN_API}/banners/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data.data;
  },

  // --- Admin Testimonials ---
  getAllTestimonials: async (): Promise<TestimonialResponse[]> => {
    const response = await apiClient.get(`${ADMIN_API}/testimonials`);
    return response.data.data;
  },

  createTestimonial: async (request: TestimonialRequest): Promise<TestimonialResponse> => {
    const response = await apiClient.post(`${ADMIN_API}/testimonials`, request);
    apiCache.clear();
    return response.data.data;
  },

  updateTestimonial: async (id: number, request: TestimonialRequest): Promise<TestimonialResponse> => {
    const response = await apiClient.put(`${ADMIN_API}/testimonials/${id}`, request);
    apiCache.clear();
    return response.data.data;
  },

  deleteTestimonial: async (id: number): Promise<void> => {
    await apiClient.delete(`${ADMIN_API}/testimonials/${id}`);
    apiCache.clear();
  },

  reorderTestimonials: async (requests: ReorderRequest[]): Promise<void> => {
    await apiClient.patch(`${ADMIN_API}/testimonials/reorder`, requests);
    apiCache.clear();
  },

  uploadTestimonialPhoto: async (id: number, file: File): Promise<TestimonialResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${ADMIN_API}/testimonials/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiCache.clear();
    return response.data.data;
  },

  // --- Admin Why Choose Us ---
  getAllWhyChooseUsItems: async (): Promise<WhyChooseUsItemResponse[]> => {
    const response = await apiClient.get(`${ADMIN_API}/why-choose-us`);
    return response.data.data;
  },

  createWhyChooseUsItem: async (request: WhyChooseUsItemRequest): Promise<WhyChooseUsItemResponse> => {
    const response = await apiClient.post(`${ADMIN_API}/why-choose-us`, request);
    apiCache.clear();
    return response.data.data;
  },

  updateWhyChooseUsItem: async (id: number, request: WhyChooseUsItemRequest): Promise<WhyChooseUsItemResponse> => {
    const response = await apiClient.put(`${ADMIN_API}/why-choose-us/${id}`, request);
    apiCache.clear();
    return response.data.data;
  },

  deleteWhyChooseUsItem: async (id: number): Promise<void> => {
    await apiClient.delete(`${ADMIN_API}/why-choose-us/${id}`);
    apiCache.clear();
  },

  reorderWhyChooseUsItems: async (requests: ReorderRequest[]): Promise<void> => {
    await apiClient.patch(`${ADMIN_API}/why-choose-us/reorder`, requests);
    apiCache.clear();
  }
};
