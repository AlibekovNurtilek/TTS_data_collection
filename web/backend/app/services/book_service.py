from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List

from app.models.book import Book
from app.models.chunk import Chunk
from app.repositories.book_repository import BookRepository
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.category_repository import CategoryRepository
from app.core.document_parser import parse_document
from app.core.text_processor import split_text_into_chunks


class BookService:
    def __init__(self, db: Session):
        self.db = db
        self.book_repo = BookRepository()
        self.chunk_repo = ChunkRepository()
        self.category_repo = CategoryRepository()
    
    def get_all_books(
        self,
        page_number: int = 1,
        limit: int = 100,
        category_id: int | None = None,
        speaker_id: int | None = None,
        search: str | None = None
    ) -> tuple[List[Book], int]:
        return self.book_repo.get_all(
            self.db,
            page_number=page_number,
            limit=limit,
            category_id=category_id,
            speaker_id=speaker_id,
            search=search
        )
    
    def get_books_by_category(self, category_id: int, page_number: int = 1, limit: int = 100) -> tuple[List[Book], int]:
        return self.book_repo.get_by_category(self.db, category_id, page_number=page_number, limit=limit)
    
    def get_book_by_id(self, book_id: int) -> Book:
        book = self.book_repo.get_by_id(self.db, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found",
            )
        return book
    
    async def upload_book(
        self,
        file: UploadFile,
        category_id: int,
        title: str | None = None
    ) -> Book:
        # Проверяем существование категории
        category = self.category_repo.get_by_id(self.db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        
        # Парсим документ
        text, file_type = await parse_document(file)
        
        # Определяем название книги
        book_title = title or file.filename or "Untitled"
        
        # Создаем книгу
        new_book = Book(
            title=book_title,
            original_filename=file.filename or "unknown",
            file_type=file_type,
            category_id=category_id
        )
        book = self.book_repo.create(self.db, new_book)
        
        # Разбиваем текст на чанки
        try:
            chunks_text = split_text_into_chunks(text)
        except Exception as e:
            # Если не удалось разбить на чанки, удаляем книгу и возвращаем ошибку
            self.book_repo.delete(self.db, book)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to split text into chunks: {str(e)}"
            )
        
        # Проверяем, что получились чанки
        if not chunks_text:
            # Если чанков нет, удаляем книгу
            self.book_repo.delete(self.db, book)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create chunks from document. Document may be empty or invalid."
            )
        
        # Создаем чанки с валидацией
        chunks = []
        for index, chunk_text in enumerate(chunks_text, start=1):
            # Дополнительная валидация перед созданием
            if not chunk_text or not chunk_text.strip():
                continue
            
            estimated_duration = 0
            chunk = Chunk(
                book_id=book.id,
                text=chunk_text.strip(),
                order_index=index,
                estimated_duration=estimated_duration
            )
            chunks.append(chunk)
        
        # Сохраняем чанки в БД
        if chunks:
            try:
                self.chunk_repo.create_bulk(self.db, chunks)
            except Exception as e:
                # Если не удалось сохранить чанки, удаляем книгу
                self.book_repo.delete(self.db, book)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save chunks to database: {str(e)}"
                )
        else:
            # Если не удалось создать валидные чанки, удаляем книгу
            self.book_repo.delete(self.db, book)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid chunks could be created from the document."
            )
        
        return book
    
    def delete_book(self, book_id: int) -> None:
        book = self.get_book_by_id(book_id)
        self.book_repo.delete(self.db, book)



