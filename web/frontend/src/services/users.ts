import { api } from "@/my_lib/api";
import type { User, UserCreate, UsersPaginatedResponse } from "@/types";

export const usersService = {
  async getUsers(pageNumber = 1, limit = 100): Promise<UsersPaginatedResponse> {
    return api.get<UsersPaginatedResponse>(`/admin/users?pageNumber=${pageNumber}&limit=${limit}`);
  },

  async getUser(userId: number): Promise<User> {
    return api.get<User>(`/admin/users/${userId}`);
  },

  async createUser(userData: UserCreate): Promise<User> {
    return api.post<User>("/admin/users", userData);
  },

  async deleteUser(userId: number): Promise<void> {
    return api.delete(`/admin/users/${userId}`);
  },
};
