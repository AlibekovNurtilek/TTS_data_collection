import { api } from "@/lib/api";
import type { Book } from "@/types";

export const booksService = {
  async getBooks(skip = 0, limit = 100, categoryId?: number): Promise<Book[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (categoryId) {
      params.append("category_id", categoryId.toString());
    }
    return api.get<Book[]>(`/books?${params}`);
  },

  async getBook(bookId: number): Promise<Book> {
    return api.get<Book>(`/books/${bookId}`);
  },

  async uploadBook(file: File, categoryId: number, title?: string): Promise<Book> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category_id", categoryId.toString());
    if (title) {
      formData.append("title", title);
    }
    return api.uploadFile<Book>("/books/upload", formData);
  },

  async deleteBook(bookId: number): Promise<void> {
    return api.delete(`/books/${bookId}`);
  },
};
