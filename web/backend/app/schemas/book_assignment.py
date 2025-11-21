from pydantic import BaseModel
from datetime import datetime
from typing import List


class BookAssignmentCreate(BaseModel):
    """Схема для создания назначения книги спикеру"""
    book_id: int
    speaker_id: int


class BookAssignmentResponse(BaseModel):
    """Схема для ответа с информацией о назначении"""
    id: int
    book_id: int
    speaker_id: int
    assigned_at: datetime

    class Config:
        from_attributes = True


class SpeakerInfo(BaseModel):
    """Информация о спикере"""
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class BookInfo(BaseModel):
    """Информация о книге"""
    id: int
    title: str
    original_filename: str
    file_type: str
    category_id: int
    total_chunks: int = 0
    recorded_chunks: int = 0
    unrecorded_chunks: int = 0
    progress_percentage: float = 0.0

    class Config:
        from_attributes = True


class BookWithSpeakersResponse(BaseModel):
    """Схема для книги со списком назначенных спикеров"""
    id: int
    title: str
    original_filename: str
    file_type: str
    category_id: int
    created_at: datetime
    updated_at: datetime | None
    assigned_speakers: List[SpeakerInfo] = []

    class Config:
        from_attributes = True


class SpeakerWithBooksResponse(BaseModel):
    """Схема для спикера со списком назначенных книг"""
    id: int
    username: str
    role: str
    assigned_books: List[BookInfo] = []

    class Config:
        from_attributes = True

