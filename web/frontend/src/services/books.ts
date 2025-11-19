import { api } from "@/lib/api";
import type { Book, BooksPaginatedResponse } from "@/types";

export const booksService = {
  async getBooks(
    pageNumber = 1,
    limit = 100,
    categoryId?: number,
    speakerId?: number,
    search?: string
  ): Promise<BooksPaginatedResponse> {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      limit: limit.toString(),
    });
    if (categoryId) {
      params.append("category_id", categoryId.toString());
    }
    if (speakerId) {
      params.append("speaker_id", speakerId.toString());
    }
    if (search) {
      params.append("search", search);
    }
    return api.get<BooksPaginatedResponse>(`/admin/books?${params}`);
  },

  async getBook(bookId: number): Promise<Book> {
    return api.get<Book>(`/admin/books/${bookId}`);
  },

  async uploadBook(file: File, categoryId: number, title?: string): Promise<Book> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category_id", categoryId.toString());
    if (title) {
      formData.append("title", title);
    }
    return api.uploadFile<Book>("/admin/books/upload", formData);
  },

  async deleteBook(bookId: number): Promise<void> {
    return api.delete(`/admin/books/${bookId}`);
  },
};
