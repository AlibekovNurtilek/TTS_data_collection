import { api } from "@/my_lib/api";
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

  async getBookChunksWithRecordings(
    bookId: number,
    speakerId: number,
    pageNumber = 1,
    limit = 100,
    search?: string,
    filter?: "all" | "recorded" | "not_recorded"
  ): Promise<SpeakerChunksPaginatedResponse> {
    const params = new URLSearchParams({
      speaker_id: speakerId.toString(),
      pageNumber: pageNumber.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append("search", search);
    }
    if (filter) {
      params.append("filter", filter);
    }
    return api.get<SpeakerChunksPaginatedResponse>(`/admin/chunks/books/${bookId}/chunks/with-recordings?${params}`);
  },

  async getChunk(chunkId: number): Promise<Chunk> {
    return api.get<Chunk>(`/admin/chunks/${chunkId}`);
  },
};
