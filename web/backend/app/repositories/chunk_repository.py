from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple, Optional
from app.models.chunk import Chunk


class ChunkRepository:
    @staticmethod
    def get_by_book(
        db: Session,
        book_id: int,
        page_number: int = 1,
        limit: int = 100,
        search: Optional[str] = None
    ) -> Tuple[List[Chunk], int]:
        skip = (page_number - 1) * limit
        query = db.query(Chunk).filter(Chunk.book_id == book_id)
        
        # Поиск по тексту чанка
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(Chunk.text.ilike(search_pattern))
        
        # Подсчет общего количества с учетом фильтров
        total = query.count()
        
        # Получение элементов с пагинацией и сортировкой
        items = query.order_by(Chunk.order_index).offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def get_by_id(db: Session, chunk_id: int) -> Chunk | None:
        return db.query(Chunk).filter(Chunk.id == chunk_id).first()
    
    @staticmethod
    def create_bulk(db: Session, chunks: List[Chunk]) -> List[Chunk]:
        db.add_all(chunks)
        db.commit()
        for chunk in chunks:
            db.refresh(chunk)
        return chunks
    
    @staticmethod
    def count_by_book(db: Session, book_id: int) -> int:
        return db.query(Chunk).filter(Chunk.book_id == book_id).count()
    
    @staticmethod
    def get_next_unrecorded_chunk(db: Session, book_id: int, speaker_id: int) -> Chunk | None:
        """
        Получить следующий не записанный чанк для спикера.
        Возвращает чанк с минимальным order_index, который еще не записан этим спикером.
        """
        from app.models.recording import Recording
        from sqlalchemy import and_, outerjoin
        
        # Используем LEFT JOIN для поиска чанков без записей от этого спикера
        chunk = db.query(Chunk).outerjoin(
            Recording,
            and_(
                Recording.chunk_id == Chunk.id,
                Recording.speaker_id == speaker_id
            )
        ).filter(
            and_(
                Chunk.book_id == book_id,
                Recording.id.is_(None)  # Нет записи от этого спикера
            )
        ).order_by(Chunk.order_index).first()
        
        return chunk



