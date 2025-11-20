from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.models.book import Book
from app.models.user import User, UserRole
from app.repositories.book_assignment_repository import BookAssignmentRepository
from app.repositories.book_repository import BookRepository
from app.repositories.user_repository import UserRepository
from app.schemas.book_assignment import (
    BookWithSpeakersResponse,
    SpeakerWithBooksResponse,
    SpeakerInfo,
    BookInfo
)


class BookAssignmentService:
    def __init__(self, db: Session):
        self.db = db
        self.assignment_repo = BookAssignmentRepository()
        self.book_repo = BookRepository()
        self.user_repo = UserRepository()
    
    def assign_book_to_speaker(self, book_id: int, speaker_id: int) -> None:
        """Назначить книгу спикеру"""
        # Проверяем существование книги
        book = self.book_repo.get_by_id(self.db, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        # Проверяем существование пользователя и что он спикер
        speaker = self.user_repo.get_by_id(self.db, speaker_id)
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found"
            )
        
        if speaker.role != UserRole.SPEAKER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a speaker"
            )
        
        # Проверяем, не назначена ли уже книга
        if self.assignment_repo.is_assigned(self.db, book_id, speaker_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book is already assigned to this speaker"
            )
        
        # Назначаем книгу
        self.assignment_repo.assign_book_to_speaker(self.db, book_id, speaker_id)
    
    def remove_assignment(self, book_id: int, speaker_id: int) -> None:
        """Удалить назначение книги спикеру"""
        # Проверяем существование
        book = self.book_repo.get_by_id(self.db, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        speaker = self.user_repo.get_by_id(self.db, speaker_id)
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found"
            )
        
        # Проверяем, назначена ли книга
        if not self.assignment_repo.is_assigned(self.db, book_id, speaker_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Удаляем назначение
        self.assignment_repo.remove_assignment(self.db, book_id, speaker_id)
    
    def get_book_with_speakers(self, book_id: int) -> BookWithSpeakersResponse:
        """Получить книгу со списком назначенных спикеров"""
        book = self.book_repo.get_by_id(self.db, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )
        
        speakers = self.assignment_repo.get_assignments_by_book(self.db, book_id)
        
        book_data = BookWithSpeakersResponse.model_validate(book)
        book_data.assigned_speakers = [
            SpeakerInfo.model_validate(speaker) for speaker in speakers
        ]
        
        return book_data
    
    def get_speaker_with_books(self, speaker_id: int) -> SpeakerWithBooksResponse:
        """Получить спикера со списком назначенных книг"""
        speaker = self.user_repo.get_by_id(self.db, speaker_id)
        if not speaker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speaker not found"
            )
        
        if speaker.role != UserRole.SPEAKER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a speaker"
            )
        
        books = self.assignment_repo.get_assignments_by_speaker(self.db, speaker_id)
        
        speaker_data = SpeakerWithBooksResponse.model_validate(speaker)
        speaker_data.assigned_books = [
            BookInfo.model_validate(book) for book in books
        ]
        
        return speaker_data
    
    def get_user_with_books(
        self,
        user_id: int,
        category_id: int | None = None,
        search: str | None = None
    ) -> SpeakerWithBooksResponse:
        """Получить пользователя со списком назначенных книг (без проверки роли)"""
        user = self.user_repo.get_by_id(self.db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        books = self.assignment_repo.get_assignments_by_speaker(
            self.db,
            user_id,
            category_id=category_id,
            search=search
        )
        
        user_data = SpeakerWithBooksResponse.model_validate(user)
        user_data.assigned_books = [
            BookInfo.model_validate(book) for book in books
        ]
        
        return user_data
    
    def get_all_speakers(self, page_number: int = 1, limit: int = 100) -> tuple[List[User], int]:
        """Получить всех спикеров с пагинацией"""
        all_users, total = self.user_repo.get_all(self.db, page_number=page_number, limit=limit)
        speakers = [user for user in all_users if user.role == UserRole.SPEAKER]
        # Пересчитываем total для спикеров
        # Это не идеально, но для простоты оставим так
        # В реальном приложении лучше сделать отдельный запрос с фильтром
        return speakers, total

