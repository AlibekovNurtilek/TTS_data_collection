from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Literal

from app.database import get_db
from app.dependencies import get_current_user, verify_book_access
from app.models.user import User, UserRole
from app.schemas.chunk import SpeakerChunkResponse, SpeakerChunksPaginatedResponse
from app.services.chunk_service import ChunkService
from app.repositories.recording_repository import RecordingRepository

router = APIRouter()


@router.get(
    "/me/books/{book_id}/chunks",
    response_model=SpeakerChunksPaginatedResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_book_chunks(
    book_id: int,
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    search: Optional[str] = Query(default=None, description="Поиск по тексту чанка"),
    filter: Optional[Literal["all", "recorded", "not_recorded"]] = Query(
        default="all",
        description="Фильтр: all - все, recorded - только озвученные, not_recorded - только не озвученные"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить чанки книги для текущего спикера с информацией о записях.
    Доступно только для спикеров, которым назначена книга.
    
    - **book_id**: ID книги
    - **pageNumber**: Номер страницы (начинается с 1)
    - **limit**: Количество записей на странице (максимум 1000)
    - **search**: Поиск по тексту чанка
    - **filter**: Фильтр по статусу записи (all/recorded/not_recorded)
    """
    # Проверяем, что пользователь является спикером
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    # Проверяем доступ к книге
    verify_book_access(book_id, current_user, db)
    
    chunk_service = ChunkService(db)
    recording_repo = RecordingRepository()
    
    # Получаем все чанки книги
    chunks, total_count = chunk_service.get_chunks_by_book(
        book_id,
        page_number=pageNumber,
        limit=limit,
        search=search
    )
    
    # Для каждого чанка проверяем, есть ли запись от текущего спикера
    speaker_chunks = []
    for chunk in chunks:
        # Проверяем наличие записи от этого спикера
        recording = recording_repo.get_by_chunk_and_speaker(
            db,
            chunk.id,
            current_user.id
        )
        
        is_recorded = recording is not None
        
        # Применяем фильтр
        if filter == "recorded" and not is_recorded:
            continue
        if filter == "not_recorded" and is_recorded:
            continue
        
        # Формируем ответ
        from app.schemas.recording import RecordingResponse
        speaker_chunk = SpeakerChunkResponse(
            id=chunk.id,
            book_id=chunk.book_id,
            text=chunk.text,
            order_index=chunk.order_index,
            estimated_duration=chunk.estimated_duration,
            created_at=chunk.created_at,
            updated_at=chunk.updated_at,
            is_recorded_by_me=is_recorded,
            my_recording=RecordingResponse.model_validate(recording) if recording else None
        )
        speaker_chunks.append(speaker_chunk)
    
    # Если применен фильтр, нужно пересчитать total
    if filter != "all":
        # Получаем все чанки без пагинации для подсчета
        all_chunks, _ = chunk_service.get_chunks_by_book(
            book_id,
            page_number=1,
            limit=10000,  # Большой лимит для получения всех
            search=search
        )
        
        filtered_count = 0
        for chunk in all_chunks:
            recording = recording_repo.get_by_chunk_and_speaker(
                db,
                chunk.id,
                current_user.id
            )
            is_recorded = recording is not None
            
            if filter == "recorded" and is_recorded:
                filtered_count += 1
            elif filter == "not_recorded" and not is_recorded:
                filtered_count += 1
        
        total_count = filtered_count
    
    return SpeakerChunksPaginatedResponse(
        items=speaker_chunks,
        total=total_count,
        pageNumber=pageNumber,
        limit=limit
    )

