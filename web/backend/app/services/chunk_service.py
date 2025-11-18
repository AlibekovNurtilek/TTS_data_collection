from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Tuple

from app.models.chunk import Chunk
from app.models.book import Book
from app.repositories.chunk_repository import ChunkRepository
from app.repositories.book_repository import BookRepository


class ChunkService:
    def __init__(self, db: Session):
        self.db = db
        self.chunk_repo = ChunkRepository()
        self.book_repo = BookRepository()
    
    def get_chunks_by_book(
        self,
        book_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Chunk], int]:
        """
        Получить чанки книги с пагинацией.
        
        Returns:
            Tuple[List[Chunk], int]: (список чанков, общее количество чанков)
        """
        # Проверяем существование книги
        book = self.book_repo.get_by_id(self.db, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found",
            )
        
        # Получаем чанки с пагинацией
        chunks = self.chunk_repo.get_by_book(self.db, book_id, skip=skip, limit=limit)
        
        # Получаем общее количество чанков
        total_count = self.chunk_repo.count_by_book(self.db, book_id)
        
        return chunks, total_count
    
    def get_chunk_by_id(self, chunk_id: int) -> Chunk:
        """Получить чанк по ID"""
        chunk = self.chunk_repo.get_by_id(self.db, chunk_id)
        if not chunk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chunk not found",
            )
        return chunk

