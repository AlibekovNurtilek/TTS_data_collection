import { api } from "@/lib/api";
import type { Recording } from "@/types";

export const recordingsService = {
  async uploadRecording(chunkId: number, audioFile: File): Promise<Recording> {
    const formData = new FormData();
    formData.append("audio_file", audioFile);
    return api.uploadFile<Recording>(`/recordings/chunks/${chunkId}/record`, formData);
  },

  async getChunkRecordings(chunkId: number): Promise<Recording[]> {
    return api.get<Recording[]>(`/recordings/chunks/${chunkId}`);
  },

  async getRecording(recordingId: number): Promise<Recording> {
    return api.get<Recording>(`/recordings/${recordingId}`);
  },
};
