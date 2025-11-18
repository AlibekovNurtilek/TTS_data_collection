from sqlalchemy.orm import Session
from typing import List
from app.models.chunk import Chunk


class ChunkRepository:
    @staticmethod
    def get_by_book(db: Session, book_id: int, skip: int = 0, limit: int = 1000) -> List[Chunk]:
        return db.query(Chunk).filter(Chunk.book_id == book_id).order_by(Chunk.order_index).offset(skip).limit(limit).all()
    
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



