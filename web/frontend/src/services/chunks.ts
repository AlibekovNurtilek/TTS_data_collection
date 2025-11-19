import { api } from "@/lib/api";
import type { Chunk, ChunksPaginatedResponse, SpeakerChunk, SpeakerChunksPaginatedResponse } from "@/types";

export const chunksService = {
  // Admin endpoints
  async getBookChunks(
    bookId: number,
    pageNumber = 1,
    limit = 100,
    search?: string
  ): Promise<ChunksPaginatedResponse> {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    return api.get<ChunksPaginatedResponse>(`/admin/chunks/books/${bookId}/chunks?${params}`);
  },

  async getChunk(chunkId: number): Promise<Chunk> {
    return api.get<Chunk>(`/admin/chunks/${chunkId}`);
  },
};
