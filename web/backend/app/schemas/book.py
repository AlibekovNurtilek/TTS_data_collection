from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.pagination import PaginatedResponse


class BookResponse(BaseModel):
    id: int
    title: str
    original_filename: str
    file_type: str
    category_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class BookWithChunksResponse(BookResponse):
    chunks_count: int = 0


class BookWithStatisticsResponse(BookResponse):
    """Расширенная информация о книге со статистикой для спикера"""
    total_chunks: int = 0
    recorded_chunks: int = 0
    unrecorded_chunks: int = 0
    progress_percentage: float = 0.0


class BookUpload(BaseModel):
    category_id: int
    title: Optional[str] = None


class BooksPaginatedResponse(PaginatedResponse[BookResponse]):
    """Пагинированный ответ для книг"""
    pass



