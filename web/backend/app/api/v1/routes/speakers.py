from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Literal

from app.database import get_db
from app.dependencies import get_current_user, verify_book_access
from app.models.user import User, UserRole
from app.schemas.chunk import SpeakerChunkResponse, SpeakerChunksPaginatedResponse
from app.schemas.book import BookResponse, BookWithStatisticsResponse
from app.services.chunk_service import ChunkService
from app.services.book_service import BookService
from app.repositories.recording_repository import RecordingRepository
from app.repositories.chunk_repository import ChunkRepository

router = APIRouter()


@router.get(
    "/me/books/{book_id}",
    response_model=BookWithStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить информацию о книге для текущего спикера со статистикой.
    Доступно только для спикеров, которым назначена книга.
    
    - **book_id**: ID книги
    
    Возвращает расширенную информацию о книге, включая:
    - Общее количество чанков
    - Количество записанных чанков
    - Количество не записанных чанков
    - Процент прогресса
    """
    # Проверяем, что пользователь является спикером
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    # Проверяем доступ к книге
    verify_book_access(book_id, current_user, db)
    
    book_service = BookService(db)
    book = book_service.get_book_by_id(book_id)
    
    # Получаем статистику по чанкам
    chunk_repo = ChunkRepository()
    recording_repo = RecordingRepository()
    
    # Общее количество чанков
    total_chunks = chunk_repo.count_by_book(db, book_id)
    
    # Получаем все чанки книги
    from app.models.chunk import Chunk
    all_chunks = db.query(Chunk).filter(Chunk.book_id == book_id).all()
    
    # Подсчитываем записанные чанки
    recorded_count = 0
    for chunk in all_chunks:
        recording = recording_repo.get_by_chunk_and_speaker(
            db,
            chunk.id,
            current_user.id
        )
        if recording:
            recorded_count += 1
    
    unrecorded_count = total_chunks - recorded_count
    progress_percentage = (recorded_count / total_chunks * 100) if total_chunks > 0 else 0.0
    
    # Формируем ответ
    book_response = BookResponse.model_validate(book)
    return BookWithStatisticsResponse(
        **book_response.model_dump(),
        total_chunks=total_chunks,
        recorded_chunks=recorded_count,
        unrecorded_chunks=unrecorded_count,
        progress_percentage=round(progress_percentage, 2)
    )


@router.get(
    "/me/books/{book_id}/chunks",
    response_model=SpeakerChunksPaginatedResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_book_chunks(
    book_id: int,
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=50, ge=1, le=1000, description="Количество записей на странице"),
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


@router.get(
    "/me/books/{book_id}/next-chunk",
    response_model=SpeakerChunkResponse,
    status_code=status.HTTP_200_OK
)
async def get_next_chunk_for_recording(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить следующий не записанный чанк для записи (караоке режим).
    Возвращает первый чанк с минимальным order_index, который еще не записан этим спикером.
    Доступно только для спикеров, которым назначена книга.
    
    - **book_id**: ID книги
    
    Если все чанки записаны, возвращает 404.
    """
    # Проверяем, что пользователь является спикером
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    # Проверяем доступ к книге
    verify_book_access(book_id, current_user, db)
    
    from app.repositories.chunk_repository import ChunkRepository
    chunk_repo = ChunkRepository()
    recording_repo = RecordingRepository()
    
    # Получаем следующий не записанный чанк
    chunk = chunk_repo.get_next_unrecorded_chunk(db, book_id, current_user.id)
    
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="All chunks for this book have been recorded"
        )
    
    # Проверяем наличие записи (на всякий случай, хотя метод уже фильтрует)
    recording = recording_repo.get_by_chunk_and_speaker(
        db,
        chunk.id,
        current_user.id
    )
    
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
        is_recorded_by_me=recording is not None,
        my_recording=RecordingResponse.model_validate(recording) if recording else None
    )
    
    return speaker_chunk

