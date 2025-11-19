import { api } from "@/lib/api";
import type { BookAssignment, BookAssignmentCreate, BookWithSpeakers, SpeakerWithBooks, User, UsersPaginatedResponse } from "@/types";

export const assignmentsService = {
  async assignBook(data: BookAssignmentCreate): Promise<BookAssignment> {
    return api.post<BookAssignment>("/admin/assignments/assign", data);
  },

  async unassignBook(bookId: number, speakerId: number): Promise<void> {
    return api.delete(`/admin/assignments/assign/${bookId}/${speakerId}`);
  },

  async getBookSpeakers(bookId: number): Promise<BookWithSpeakers> {
    return api.get<BookWithSpeakers>(`/admin/assignments/book/${bookId}/speakers`);
  },

  async getSpeakerBooks(speakerId: number): Promise<SpeakerWithBooks> {
    return api.get<SpeakerWithBooks>(`/admin/assignments/speaker/${speakerId}/books`);
  },

  async getAllSpeakers(pageNumber = 1, limit = 100): Promise<UsersPaginatedResponse> {
    return api.get<UsersPaginatedResponse>(`/admin/assignments/speakers?pageNumber=${pageNumber}&limit=${limit}`);
  },

  async getMyBooks(): Promise<SpeakerWithBooks> {
    return api.get<SpeakerWithBooks>("/assignments/my-books");
  },
};
