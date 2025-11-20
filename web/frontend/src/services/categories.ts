import { api } from "@/lib/api";
import type { Category, CategoryCreate, CategoriesPaginatedResponse } from "@/types";

export const categoriesService = {
  async getCategories(pageNumber = 1, limit = 100, usePublicEndpoint = false): Promise<CategoriesPaginatedResponse> {
    // Если usePublicEndpoint = true, используем публичный эндпоинт (для спикеров)
    // Иначе используем админский эндпоинт (для админов)
    const endpoint = usePublicEndpoint ? `/categories` : `/admin/categories`;
    return api.get<CategoriesPaginatedResponse>(`${endpoint}?pageNumber=${pageNumber}&limit=${limit}`);
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
