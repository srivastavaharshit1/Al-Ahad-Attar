import { apiClient } from '../api/axios';

export interface SubCategory {
  id: number;
  name: string;
  categoryId: number;
  active: boolean;
}

export interface SubCategoryRequest {
  name: string;
  active: boolean;
}

export const subCategoryService = {
  getSubCategoriesByCategory: async (categoryId: number, onlyActive: boolean = true) => {
    const response = await apiClient.get<SubCategory[]>(`/categories/${categoryId}/subcategories?onlyActive=${onlyActive}`);
    return response.data;
  },

  createSubCategory: async (categoryId: number, data: SubCategoryRequest) => {
    const response = await apiClient.post<SubCategory>(`/categories/${categoryId}/subcategories`, data);
    return response.data;
  },

  updateSubCategory: async (categoryId: number, subCategoryId: number, data: SubCategoryRequest) => {
    const response = await apiClient.put<SubCategory>(`/categories/${categoryId}/subcategories/${subCategoryId}`, data);
    return response.data;
  },

  deleteSubCategory: async (categoryId: number, subCategoryId: number) => {
    await apiClient.delete(`/categories/${categoryId}/subcategories/${subCategoryId}`);
  }
};
