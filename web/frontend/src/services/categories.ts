import { api } from "@/lib/api";
import type { Category, CategoryCreate, CategoriesPaginatedResponse } from "@/types";

export const categoriesService = {
  async getCategories(pageNumber = 1, limit = 100): Promise<CategoriesPaginatedResponse> {
    return api.get<CategoriesPaginatedResponse>(`/admin/categories?pageNumber=${pageNumber}&limit=${limit}`);
  },

  async getCategory(categoryId: number): Promise<Category> {
    return api.get<Category>(`/admin/categories/${categoryId}`);
  },

  async createCategory(categoryData: CategoryCreate): Promise<Category> {
    return api.post<Category>("/admin/categories", categoryData);
  },

  async updateCategory(categoryId: number, categoryData: Partial<CategoryCreate>): Promise<Category> {
    return api.put<Category>(`/admin/categories/${categoryId}`, categoryData);
  },

  async deleteCategory(categoryId: number): Promise<void> {
    return api.delete(`/admin/categories/${categoryId}`);
  },
};
