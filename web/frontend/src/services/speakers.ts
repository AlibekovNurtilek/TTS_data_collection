import { api } from "@/lib/api";
import type { SpeakerChunk, SpeakerChunksPaginatedResponse, Book } from "@/types";

export const speakersService = {
  async getMyBook(bookId: number): Promise<Book> {
    return api.get<Book>(`/speakers/me/books/${bookId}`);
  },

  async getNextChunk(bookId: number): Promise<SpeakerChunk> {
    return api.get<SpeakerChunk>(`/speakers/me/books/${bookId}/next-chunk`);
  },

  async getMyBookChunks(
    bookId: number,
    pageNumber = 1,
    limit = 50,
    search?: string,
    filter?: "all" | "recorded" | "not_recorded"
  ): Promise<SpeakerChunksPaginatedResponse> {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    if (filter) {
      params.append("filter", filter);
    }
    return api.get<SpeakerChunksPaginatedResponse>(`/speakers/me/books/${bookId}/chunks?${params}`);
  },
};

