import { api } from "@/lib/api";
import type { BookAssignment, BookAssignmentCreate, BookWithSpeakers, SpeakerWithBooks, User } from "@/types";

export const assignmentsService = {
  async assignBook(data: BookAssignmentCreate): Promise<BookAssignment> {
    return api.post<BookAssignment>("/assignments/assign", data);
  },

  async unassignBook(bookId: number, speakerId: number): Promise<void> {
    return api.delete(`/assignments/assign/${bookId}/${speakerId}`);
  },

  async getBookSpeakers(bookId: number): Promise<BookWithSpeakers> {
    return api.get<BookWithSpeakers>(`/assignments/book/${bookId}/speakers`);
  },

  async getSpeakerBooks(speakerId: number): Promise<SpeakerWithBooks> {
    return api.get<SpeakerWithBooks>(`/assignments/speaker/${speakerId}/books`);
  },

  async getAllSpeakers(): Promise<User[]> {
    return api.get<User[]>("/assignments/speakers");
  },

  async getMyBooks(): Promise<SpeakerWithBooks> {
    return api.get<SpeakerWithBooks>("/assignments/my-books");
  },
};
