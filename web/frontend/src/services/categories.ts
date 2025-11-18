import { api } from "@/lib/api";
import type { Category, CategoryCreate } from "@/types";

export const categoriesService = {
  async getCategories(skip = 0, limit = 100): Promise<Category[]> {
    return api.get<Category[]>(`/categories?skip=${skip}&limit=${limit}`);
  },

  async getCategory(categoryId: number): Promise<Category> {
    return api.get<Category>(`/categories/${categoryId}`);
  },

  async createCategory(categoryData: CategoryCreate): Promise<Category> {
    return api.post<Category>("/categories", categoryData);
  },

  async updateCategory(categoryId: number, categoryData: Partial<CategoryCreate>): Promise<Category> {
    return api.put<Category>(`/categories/${categoryId}`, categoryData);
  },

  async deleteCategory(categoryId: number): Promise<void> {
    return api.delete(`/categories/${categoryId}`);
  },
};
