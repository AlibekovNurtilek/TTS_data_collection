from sqlalchemy.orm import Session
from sqlalchemy import and_, select, insert, delete, or_
from typing import List, Optional
from app.models.book_speaker_assignment import book_speaker_assignment
from app.models.book import Book
from app.models.user import User


class BookAssignmentRepository:
    @staticmethod
    def assign_book_to_speaker(db: Session, book_id: int, speaker_id: int) -> None:
        """Назначить книгу спикеру"""
        # Проверяем, не назначена ли уже книга этому спикеру
        stmt = select(book_speaker_assignment).where(
            and_(
                book_speaker_assignment.c.book_id == book_id,
                book_speaker_assignment.c.speaker_id == speaker_id
            )
        )
        existing = db.execute(stmt).first()
        
        if existing:
            return  # Уже назначено
        
        # Добавляем назначение
        stmt = insert(book_speaker_assignment).values(
            book_id=book_id,
            speaker_id=speaker_id
        )
        db.execute(stmt)
        db.commit()
    
    @staticmethod
    def remove_assignment(db: Session, book_id: int, speaker_id: int) -> None:
        """Удалить назначение книги спикеру"""
        stmt = delete(book_speaker_assignment).where(
            and_(
                book_speaker_assignment.c.book_id == book_id,
                book_speaker_assignment.c.speaker_id == speaker_id
            )
        )
        db.execute(stmt)
        db.commit()
    
    @staticmethod
    def get_assignments_by_book(db: Session, book_id: int) -> List[User]:
        """Получить всех спикеров, которым назначена книга"""
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return []
        return book.assigned_speakers
    
    @staticmethod
    def get_assignments_by_speaker(
        db: Session,
        speaker_id: int,
        category_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[Book]:
        """Получить все книги, назначенные спикеру с фильтрацией"""
        # Используем join для фильтрации
        query = db.query(Book).join(
            book_speaker_assignment,
            Book.id == book_speaker_assignment.c.book_id
        ).filter(
            book_speaker_assignment.c.speaker_id == speaker_id
        )
        
        # Фильтр по категории
        if category_id:
            query = query.filter(Book.category_id == category_id)
        
        # Поиск по названию книги
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Book.title.ilike(search_pattern),
                    Book.original_filename.ilike(search_pattern)
                )
            )
        
        return query.all()
    
    @staticmethod
    def is_assigned(db: Session, book_id: int, speaker_id: int) -> bool:
        """Проверить, назначена ли книга спикеру"""
        stmt = select(book_speaker_assignment).where(
            and_(
                book_speaker_assignment.c.book_id == book_id,
                book_speaker_assignment.c.speaker_id == speaker_id
            )
        )
        result = db.execute(stmt).first()
        return result is not None

