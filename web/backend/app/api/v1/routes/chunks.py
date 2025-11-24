from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Literal

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.chunk import ChunkResponse, ChunksPaginatedResponse, SpeakerChunkResponse, SpeakerChunksPaginatedResponse
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
    "/books/{book_id}/chunks/with-recordings",
    response_model=SpeakerChunksPaginatedResponse,
    status_code=status.HTTP_200_OK
)
async def get_book_chunks_with_recordings(
    book_id: int,
    speaker_id: int = Query(..., description="ID спикера для получения записей"),
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    search: Optional[str] = Query(default=None, description="Поиск по тексту чанка"),
    filter: Optional[Literal["all", "recorded", "not_recorded"]] = Query(
        default="all",
        description="Фильтр: all - все, recorded - только озвученные, not_recorded - только не озвученные"
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Получить чанки книги с записями конкретного спикера (только для админа).
    
    - **book_id**: ID книги
    - **speaker_id**: ID спикера
    - **pageNumber**: Номер страницы (начинается с 1)
    - **limit**: Количество записей на странице (максимум 1000)
    - **search**: Поиск по тексту чанка
    - **filter**: Фильтр по статусу записи (all/recorded/not_recorded)
    """
    chunk_service = ChunkService(db)
    
    # ШАГ 1: Получаем ВСЕ чанки книги (без пагинации, но с поиском)
    # Используем большой лимит для получения всех чанков
    all_chunks, _ = chunk_service.get_chunks_by_book(
        book_id,
        page_number=1,
        limit=100000,  # Большой лимит для получения всех чанков
        search=search
    )
    
    if not all_chunks:
        return SpeakerChunksPaginatedResponse(
            items=[],
            total=0,
            pageNumber=pageNumber,
            limit=limit
        )
    
    # Оптимизация: получаем все записи одним bulk-запросом
    from app.models.recording import Recording
    chunk_ids = [chunk.id for chunk in all_chunks]
    
    # Один запрос для получения всех записей спикера по этим чанкам
    recordings = db.query(Recording).filter(
        Recording.chunk_id.in_(chunk_ids),
        Recording.speaker_id == speaker_id
    ).all()
    
    # Создаем словарь для быстрого поиска записей
    recordings_map = {rec.chunk_id: rec for rec in recordings}
    
    # ШАГ 2: Фильтруем чанки по статусу записи
    filtered_chunks = []
    for chunk in all_chunks:
        recording = recordings_map.get(chunk.id)
        is_recorded = recording is not None
        
        # Применяем фильтр
        if filter == "recorded" and not is_recorded:
            continue
        if filter == "not_recorded" and is_recorded:
            continue
        
        # Сохраняем чанк с информацией о записи
        filtered_chunks.append((chunk, recording, is_recorded))
    
    # ШАГ 3: Применяем пагинацию к отфильтрованным результатам
    total_count = len(filtered_chunks)
    skip = (pageNumber - 1) * limit
    paginated_chunks = filtered_chunks[skip:skip + limit]
    
    # Формируем ответ
    from app.schemas.recording import RecordingResponse
    speaker_chunks = []
    for chunk, recording, is_recorded in paginated_chunks:
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
    
    return SpeakerChunksPaginatedResponse(
        items=speaker_chunks,
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

