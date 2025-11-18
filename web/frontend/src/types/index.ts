export type UserRole = "admin" | "speaker";

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface UserCreate {
  username: string;
  password: string;
  role: UserRole;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CategoryCreate {
  name: string;
  description?: string;
}

export interface Book {
  id: number;
  title: string;
  original_filename: string;
  file_type: string;
  category_id: number;
  created_at: string;
  updated_at: string | null;
}

export interface Chunk {
  id: number;
  book_id: number;
  text: string;
  order_index: number;
  estimated_duration: number | null;
  is_recorded: boolean;
  audio_file_path: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ChunksPaginatedResponse {
  items: Chunk[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface Recording {
  id: number;
  chunk_id: number;
  speaker_id: number;
  audio_file_path: string;
  duration: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface BookAssignmentCreate {
  book_id: number;
  speaker_id: number;
}

export interface BookAssignment {
  id: number;
  book_id: number;
  speaker_id: number;
  assigned_at: string;
}

export interface SpeakerInfo {
  id: number;
  username: string;
  role: string;
}

export interface BookWithSpeakers extends Book {
  assigned_speakers: SpeakerInfo[];
}

export interface BookInfo {
  id: number;
  title: string;
  original_filename: string;
  file_type: string;
  category_id: number;
}

export interface SpeakerWithBooks extends User {
  assigned_books: BookInfo[];
}
