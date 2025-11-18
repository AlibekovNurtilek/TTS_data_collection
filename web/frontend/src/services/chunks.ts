import { api } from "@/lib/api";
import type { Chunk, ChunksPaginatedResponse } from "@/types";

export const chunksService = {
  async getBookChunks(bookId: number, skip = 0, limit = 100): Promise<ChunksPaginatedResponse> {
    return api.get<ChunksPaginatedResponse>(`/chunks/books/${bookId}/chunks?skip=${skip}&limit=${limit}`);
  },

  async getChunk(chunkId: number): Promise<Chunk> {
    return api.get<Chunk>(`/chunks/${chunkId}`);
  },
};
