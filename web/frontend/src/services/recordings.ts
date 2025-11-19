import { api } from "@/lib/api";
import type { Recording, RecordingsPaginatedResponse } from "@/types";

export const recordingsService = {
  async uploadRecording(chunkId: number, audioFile: File): Promise<Recording> {
    const formData = new FormData();
    formData.append("audio_file", audioFile);
    return api.uploadFile<Recording>(`/recordings/chunks/${chunkId}/record`, formData);
  },

  async getChunkRecordings(chunkId: number, pageNumber = 1, limit = 100): Promise<RecordingsPaginatedResponse> {
    return api.get<RecordingsPaginatedResponse>(`/recordings/chunks/${chunkId}?pageNumber=${pageNumber}&limit=${limit}`);
  },

  async getRecording(recordingId: number): Promise<Recording> {
    return api.get<Recording>(`/recordings/${recordingId}`);
  },
};
