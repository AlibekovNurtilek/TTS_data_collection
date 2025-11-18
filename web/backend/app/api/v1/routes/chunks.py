from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, verify_book_access
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
    skip: int = Query(default=0, ge=0, description="Количество пропущенных записей"),
    limit: int = Query(default=100, ge=1, le=1000, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить чанки книги по ID с пагинацией.
    Доступно для админов и спикеров, которым назначена книга.
    
    - **book_id**: ID книги
    - **skip**: Количество пропущенных записей (для пагинации)
    - **limit**: Максимальное количество записей в ответе (максимум 1000)
    """
    # Проверяем доступ к книге
    verify_book_access(book_id, current_user, db)
    
    chunk_service = ChunkService(db)
    chunks, total_count = chunk_service.get_chunks_by_book(book_id, skip=skip, limit=limit)
    
    return ChunksPaginatedResponse(
        items=[ChunkResponse.model_validate(chunk) for chunk in chunks],
        total=total_count,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total_count
    )


@router.get(
    "/{chunk_id}",
    response_model=ChunkResponse,
    status_code=status.HTTP_200_OK
)
async def get_chunk(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить чанк по ID.
    Доступно для админов и спикеров, которым назначена книга, содержащая этот чанк.
    """
    chunk_service = ChunkService(db)
    chunk = chunk_service.get_chunk_by_id(chunk_id)
    
    # Проверяем доступ к книге, к которой принадлежит чанк
    verify_book_access(chunk.book_id, current_user, db)
    
    return ChunkResponse.model_validate(chunk)

