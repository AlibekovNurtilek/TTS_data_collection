import { api } from "@/lib/api";
import type { User, UserCreate } from "@/types";

export const usersService = {
  async getUsers(skip = 0, limit = 100): Promise<User[]> {
    return api.get<User[]>(`/users?skip=${skip}&limit=${limit}`);
  },

  async getUser(userId: number): Promise<User> {
    return api.get<User>(`/users/${userId}`);
  },

  async createUser(userData: UserCreate): Promise<User> {
    return api.post<User>("/users", userData);
  },

  async deleteUser(userId: number): Promise<void> {
    return api.delete(`/users/${userId}`);
  },
};
