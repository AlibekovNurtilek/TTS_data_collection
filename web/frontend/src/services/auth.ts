import { api, API_BASE_URL } from "@/my_lib/api";
import type { User } from "@/types";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    return response.user;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      // Используем fetch напрямую, чтобы избежать редиректа при 401
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  },
};
