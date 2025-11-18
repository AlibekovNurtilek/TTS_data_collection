from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.recording import RecordingResponse
from app.services.recording_service import RecordingService

router = APIRouter()


@router.post(
    "/chunks/{chunk_id}/record",
    response_model=RecordingResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_recording(
    chunk_id: int,
    audio_file: UploadFile = File(..., description="Аудио файл для записи"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Загрузить аудио запись для чанка (для спикеров).
    
    - **chunk_id**: ID чанка
    - **audio_file**: Аудио файл (поддерживаются форматы: WAV, MP3, M4A, OGG, FLAC, AAC)
    
    Аудио будет автоматически конвертировано в WAV 16-bit mono формат.
    Файл сохраняется в папку wavs/speaker_name с названием book_name_chunk_id.wav
    """
    # Проверяем, что пользователь является спикером
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can upload recordings"
        )
    
    recording_service = RecordingService(db)
    recording = await recording_service.upload_recording(
        chunk_id=chunk_id,
        speaker_id=current_user.id,
        audio_file=audio_file
    )
    
    return RecordingResponse.model_validate(recording)


@router.get(
    "/chunks/{chunk_id}",
    response_model=List[RecordingResponse],
    status_code=status.HTTP_200_OK
)
async def get_chunk_recordings(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить все записи для чанка"""
    recording_service = RecordingService(db)
    recordings = recording_service.get_recordings_by_chunk(chunk_id)
    return [RecordingResponse.model_validate(rec) for rec in recordings]


@router.get(
    "/{recording_id}",
    response_model=RecordingResponse,
    status_code=status.HTTP_200_OK
)
async def get_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить запись по ID"""
    recording_service = RecordingService(db)
    recording = recording_service.get_recording_by_id(recording_id)
    return RecordingResponse.model_validate(recording)

