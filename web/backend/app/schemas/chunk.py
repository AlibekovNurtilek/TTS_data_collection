from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.pagination import PaginatedResponse
from app.schemas.recording import RecordingResponse


class ChunkResponse(BaseModel):
    id: int
    book_id: int
    text: str
    order_index: int
    estimated_duration: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChunksPaginatedResponse(PaginatedResponse[ChunkResponse]):
    """Пагинированный ответ для чанков"""
    pass


class SpeakerChunkResponse(BaseModel):
    """Ответ для спикера с информацией о чанке и его записи"""
    id: int
    book_id: int
    text: str
    order_index: int
    estimated_duration: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    is_recorded_by_me: bool
    my_recording: Optional[RecordingResponse] = None

    class Config:
        from_attributes = True


class SpeakerChunksPaginatedResponse(PaginatedResponse[SpeakerChunkResponse]):
    """Пагинированный ответ для чанков спикера"""
    pass



