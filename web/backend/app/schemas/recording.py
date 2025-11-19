from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.pagination import PaginatedResponse


class RecordingResponse(BaseModel):
    id: int
    chunk_id: int
    speaker_id: int
    audio_file_path: str
    duration: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RecordingCreate(BaseModel):
    chunk_id: int
    speaker_id: int


class RecordingsPaginatedResponse(PaginatedResponse[RecordingResponse]):
    """Пагинированный ответ для записей"""
    pass

