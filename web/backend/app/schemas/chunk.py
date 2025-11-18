from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Generic, TypeVar

T = TypeVar('T')


class ChunkResponse(BaseModel):
    id: int
    book_id: int
    text: str
    order_index: int
    estimated_duration: Optional[int]
    is_recorded: bool
    audio_file_path: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel, Generic[T]):
    """Схема для пагинированного ответа"""
    items: List[T]
    total: int
    skip: int
    limit: int
    has_more: bool

    class Config:
        from_attributes = True


class ChunksPaginatedResponse(PaginatedResponse[ChunkResponse]):
    """Пагинированный ответ для чанков"""
    pass



