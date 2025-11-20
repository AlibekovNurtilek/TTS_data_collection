import { api } from "@/lib/api";
import type { SpeakerChunk, SpeakerChunksPaginatedResponse, Book, BookWithStatistics } from "@/types";

export const speakersService = {
  async getMyBook(bookId: number): Promise<BookWithStatistics> {
    return api.get<BookWithStatistics>(`/speakers/me/books/${bookId}`);
  },

  async getNextChunk(bookId: number): Promise<SpeakerChunk> {
    return api.get<SpeakerChunk>(`/speakers/me/books/${bookId}/next-chunk`);
  },

  async getMyBookChunks(
    bookId: number,
    pageNumber = 1,
    limit = 50,
    search?: string,
    filter: "all" | "recorded" | "not_recorded" = "all"
  ): Promise<SpeakerChunksPaginatedResponse> {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      limit: limit.toString(),
      filter: filter,
    });
    if (search) {
      params.append("search", search);
    }
    const url = `/speakers/me/books/${bookId}/chunks?${params}`;
    return api.get<SpeakerChunksPaginatedResponse>(url);
  },
};

