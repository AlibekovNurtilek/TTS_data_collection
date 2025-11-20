from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import Optional
from pathlib import Path

from app.models.recording import Recording
from app.models.chunk import Chunk
from app.models.user import User, UserRole
from app.models.book import Book
from app.repositories.recording_repository import RecordingRepository
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.user_repository import UserRepository
from app.repositories.book_repository import BookRepository
from app.core.audio_processor import convert_to_wav_16bit_mono, save_audio_file
from app.config import settings


class RecordingService:
    def __init__(self, db: Session):
        self.db = db
        self.recording_repo = RecordingRepository()
        self.chunk_repo = ChunkRepository()
        self.user_repo = UserRepository()
        self.book_repo = BookRepository()
    
    async def upload_recording(
        self,
        chunk_id: int,
        speaker_id: int,
        audio_file: UploadFile
    ) -> Recording:
        """
        Загружает аудио запись для чанка от спикера.
        
        Args:
            chunk_id: ID чанка
            speaker_id: ID спикера
            audio_file: Аудио файл
        
        Returns:
            Recording объект
        """
        # Проверяем существование чанка
        chunk = self.chunk_repo.get_by_id(self.db, chunk_id)
        if not chunk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chunk not found",
            )
        
        # Проверяем существование спикера
        speaker = self.user_repo.get_by_id(self.db, speaker_id)
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found",
            )
        
        # Проверяем, что пользователь является спикером
        if speaker.role != UserRole.SPEAKER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a speaker",
            )
        
        # Получаем книгу для формирования имени файла
        book = self.book_repo.get_by_id(self.db, chunk.book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found",
            )
        
        # Читаем аудио файл
        audio_data = await audio_file.read()
        
        # Определяем формат входного файла (будет определен автоматически по содержимому)
        input_format = None
        if audio_file.filename:
            ext = audio_file.filename.lower().split('.')[-1]
            if ext in ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac', 'webm', 'opus']:
                input_format = ext
        
        # Конвертируем в WAV 16-bit mono
        wav_data = convert_to_wav_16bit_mono(audio_data, input_format, audio_file.filename)
        
        # Сохраняем файл
        audio_file_path, duration = save_audio_file(
            wav_data,
            speaker.username,
            book.title,
            chunk_id
        )
        
        # Проверяем, есть ли уже запись от этого спикера для этого чанка
        existing_recording = self.recording_repo.get_by_chunk_and_speaker(
            self.db,
            chunk_id,
            speaker_id
        )
        
        if existing_recording:
            # Обновляем существующую запись
            existing_recording.audio_file_path = audio_file_path
            existing_recording.duration = duration
            self.db.commit()
            self.db.refresh(existing_recording)
            recording = existing_recording
        else:
            # Создаем новую запись
            recording = Recording(
                chunk_id=chunk_id,
                speaker_id=speaker_id,
                audio_file_path=audio_file_path,
                duration=duration
            )
            recording = self.recording_repo.create(self.db, recording)
        
        return recording
    
    def get_recording_by_id(self, recording_id: int) -> Recording:
        """Получить запись по ID"""
        recording = self.recording_repo.get_by_id(self.db, recording_id)
        if not recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recording not found",
            )
        return recording
    
    def get_recordings_by_chunk(self, chunk_id: int, page_number: int = 1, limit: int = 100) -> tuple[list[Recording], int]:
        """Получить записи для чанка с пагинацией"""
        return self.recording_repo.get_by_chunk(self.db, chunk_id, page_number=page_number, limit=limit)
    
    def get_recordings_by_speaker(self, speaker_id: int, page_number: int = 1, limit: int = 100) -> tuple[list[Recording], int]:
        """Получить записи спикера с пагинацией"""
        return self.recording_repo.get_by_speaker(self.db, speaker_id, page_number=page_number, limit=limit)
    
    def get_audio_file_path(self, recording_id: int, current_user: User) -> Path:
        """
        Получить абсолютный путь к аудио файлу с проверкой прав доступа.
        
        Args:
            recording_id: ID записи
            current_user: Текущий пользователь
        
        Returns:
            Path: Абсолютный путь к аудио файлу
        
        Raises:
            HTTPException: Если запись не найдена или нет доступа
        """
        # Получаем запись
        recording = self.get_recording_by_id(recording_id)
        
        # Проверяем права доступа
        # Админы имеют доступ ко всем записям
        if current_user.role == UserRole.ADMIN:
            pass  # Доступ разрешен
        # Спикеры имеют доступ только к своим записям
        elif current_user.role == UserRole.SPEAKER:
            if recording.speaker_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this recording"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Получаем абсолютный путь к файлу
        # audio_file_path хранится как относительный путь от корня проекта
        # Например: wavs/speaker_name/book_name_chunk_id.wav
        backend_dir = Path(__file__).parent.parent.parent  # Переходим из app/services/ в backend/
        
        # Если путь абсолютный, используем его как есть
        if Path(recording.audio_file_path).is_absolute():
            file_path = Path(recording.audio_file_path)
        else:
            # Иначе разрешаем относительно backend/
            file_path = backend_dir / recording.audio_file_path
        
        # Проверяем существование файла
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )
        
        return file_path

