import { api } from "@/lib/api";

export interface PeriodStatsItem {
  date: string;
  duration_hours: number;
  recordings_count: number;
}

export interface BookStatsItem {
  book_id: number;
  book_title: string;
  duration_hours: number;
  recordings_count: number;
}

export interface CategoryStatsItem {
  category_id: number;
  category_name: string;
  duration_hours: number;
  recordings_count: number;
}

export interface SpeakerStatsItem {
  speaker_id: number;
  speaker_username: string;
  duration_hours: number;
  recordings_count: number;
}

export interface SpeakerStatistics {
  total_duration_hours: number;
  total_recordings: number;
  by_period: PeriodStatsItem[];
  by_book: BookStatsItem[];
  by_category: CategoryStatsItem[];
}

export interface AdminStatistics {
  total_duration_hours: number;
  total_recordings: number;
  total_speakers: number;
  by_period: PeriodStatsItem[];
  by_speaker: SpeakerStatsItem[];
  by_book: BookStatsItem[];
  by_category: CategoryStatsItem[];
}

export const statisticsService = {
  async getMyStatistics(
    period?: "day" | "week" | "month" | "custom",
    startDate?: string,
    endDate?: string
  ): Promise<SpeakerStatistics> {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return api.get<SpeakerStatistics>(`/statistics/me?${params}`);
  },

  async getMyStatisticsByBook(bookId: number): Promise<SpeakerStatistics> {
    return api.get<SpeakerStatistics>(`/statistics/me/by-book/${bookId}`);
  },

  async getMyStatisticsByCategory(categoryId: number): Promise<SpeakerStatistics> {
    return api.get<SpeakerStatistics>(`/statistics/me/by-category/${categoryId}`);
  },

  async getAdminStatistics(
    period?: "day" | "week" | "month" | "custom",
    startDate?: string,
    endDate?: string,
    speakerId?: number,
    bookId?: number,
    categoryId?: number
  ): Promise<AdminStatistics> {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (speakerId) params.append("speaker_id", speakerId.toString());
    if (bookId) params.append("book_id", bookId.toString());
    if (categoryId) params.append("category_id", categoryId.toString());
    return api.get<AdminStatistics>(`/statistics/admin?${params}`);
  },

  async getAdminStatisticsBySpeaker(
    speakerId: number,
    period?: "day" | "week" | "month" | "custom",
    startDate?: string,
    endDate?: string
  ): Promise<AdminStatistics> {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return api.get<AdminStatistics>(`/statistics/admin/by-speaker/${speakerId}?${params}`);
  },

  async getAdminStatisticsByBook(
    bookId: number,
    period?: "day" | "week" | "month" | "custom",
    startDate?: string,
    endDate?: string
  ): Promise<AdminStatistics> {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return api.get<AdminStatistics>(`/statistics/admin/by-book/${bookId}?${params}`);
  },

  async getAdminStatisticsByCategory(
    categoryId: number,
    period?: "day" | "week" | "month" | "custom",
    startDate?: string,
    endDate?: string
  ): Promise<AdminStatistics> {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    return api.get<AdminStatistics>(`/statistics/admin/by-category/${categoryId}?${params}`);
  },
};


