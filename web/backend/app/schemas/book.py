from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


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


class BookUpload(BaseModel):
    category_id: int
    title: Optional[str] = None



