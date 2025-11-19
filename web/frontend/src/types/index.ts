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
  created_at: string;
  updated_at: string | null;
}

export interface SpeakerChunk extends Chunk {
  is_recorded_by_me: boolean;
  my_recording: Recording | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pageNumber: number;
  limit: number;
}

export interface ChunksPaginatedResponse extends PaginatedResponse<Chunk> {}
export interface SpeakerChunksPaginatedResponse extends PaginatedResponse<SpeakerChunk> {}
export interface BooksPaginatedResponse extends PaginatedResponse<Book> {}
export interface UsersPaginatedResponse extends PaginatedResponse<User> {}
export interface CategoriesPaginatedResponse extends PaginatedResponse<Category> {}
export interface RecordingsPaginatedResponse extends PaginatedResponse<Recording> {}

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
