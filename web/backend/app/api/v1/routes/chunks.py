from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.chunk import ChunkResponse, ChunksPaginatedResponse
from app.services.chunk_service import ChunkService

router = APIRouter()


@router.get(
    "/books/{book_id}/chunks",
    response_model=ChunksPaginatedResponse,
    status_code=status.HTTP_200_OK
)
async def get_book_chunks(
    book_id: int,
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    search: Optional[str] = Query(default=None, description="Поиск по тексту чанка"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Получить чанки книги по ID с пагинацией и поиском (только для админа).
    
    - **book_id**: ID книги
    - **pageNumber**: Номер страницы (начинается с 1)
    - **limit**: Количество записей на странице (максимум 1000)
    - **search**: Поиск по тексту чанка
    """
    chunk_service = ChunkService(db)
    chunks, total_count = chunk_service.get_chunks_by_book(
        book_id,
        page_number=pageNumber,
        limit=limit,
        search=search
    )
    
    return ChunksPaginatedResponse(
        items=[ChunkResponse.model_validate(chunk) for chunk in chunks],
        total=total_count,
        pageNumber=pageNumber,
        limit=limit
    )


@router.get(
    "/{chunk_id}",
    response_model=ChunkResponse,
    status_code=status.HTTP_200_OK
)
async def get_chunk(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Получить чанк по ID (только для админа).
    """
    chunk_service = ChunkService(db)
    chunk = chunk_service.get_chunk_by_id(chunk_id)
    
    return ChunkResponse.model_validate(chunk)

