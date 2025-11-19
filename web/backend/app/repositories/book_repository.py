from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from app.models.book import Book
from app.models.book_speaker_assignment import book_speaker_assignment


class BookRepository:
    @staticmethod
    def get_all(
        db: Session,
        page_number: int = 1,
        limit: int = 100,
        category_id: Optional[int] = None,
        speaker_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Book], int]:
        skip = (page_number - 1) * limit
        query = db.query(Book)
        
        # Фильтр по категории
        if category_id:
            query = query.filter(Book.category_id == category_id)
        
        # Фильтр по спикеру (через join с таблицей назначений)
        if speaker_id:
            query = query.join(book_speaker_assignment).filter(
                book_speaker_assignment.c.speaker_id == speaker_id
            ).distinct()
        
        # Поиск по названию книги
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Book.title.ilike(search_pattern),
                    Book.original_filename.ilike(search_pattern)
                )
            )
        
        # Подсчет общего количества с учетом фильтров
        total = query.count()
        
        # Получение элементов с пагинацией
        items = query.offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def get_by_id(db: Session, book_id: int) -> Book | None:
        return db.query(Book).filter(Book.id == book_id).first()
    
    @staticmethod
    def get_by_category(db: Session, category_id: int, page_number: int = 1, limit: int = 100) -> Tuple[List[Book], int]:
        skip = (page_number - 1) * limit
        total = db.query(Book).filter(Book.category_id == category_id).count()
        items = db.query(Book).filter(Book.category_id == category_id).offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def create(db: Session, book: Book) -> Book:
        db.add(book)
        db.commit()
        db.refresh(book)
        return book
    
    @staticmethod
    def delete(db: Session, book: Book) -> None:
        db.delete(book)
        db.commit()



