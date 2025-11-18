from sqlalchemy.orm import Session
from typing import List
from app.models.book import Book


class BookRepository:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Book]:
        return db.query(Book).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, book_id: int) -> Book | None:
        return db.query(Book).filter(Book.id == book_id).first()
    
    @staticmethod
    def get_by_category(db: Session, category_id: int, skip: int = 0, limit: int = 100) -> List[Book]:
        return db.query(Book).filter(Book.category_id == category_id).offset(skip).limit(limit).all()
    
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



