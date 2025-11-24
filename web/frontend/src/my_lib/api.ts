import { logger } from './logger';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response, endpoint?: string): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      errorMessage = await response.text() || errorMessage;
    }
    
    // Логируем ошибку
    logger.error(`API Error: ${endpoint}`, new Error(errorMessage), {
      status: response.status,
      endpoint,
    });
    
    // Не делаем редирект на /login если это запрос к /auth/login (ошибка логина)
    // или если мы уже на странице логина
    if (response.status === 401 && endpoint !== "/auth/login" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
    
    throw new ApiError(response.status, errorMessage);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return handleResponse<T>(response, endpoint);
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(response, endpoint);
  },

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response, endpoint);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<T>(response, endpoint);
  },

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return handleResponse<T>(response, endpoint);
  },

  async getAudioBlob(endpoint: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      credentials: "include",
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      
      if (response.status === 401 && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      
      throw new ApiError(response.status, errorMessage);
    }
    
    return response.blob();
  },
};
