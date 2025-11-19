from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from app.models.recording import Recording


class RecordingRepository:
    @staticmethod
    def create(db: Session, recording: Recording) -> Recording:
        db.add(recording)
        db.commit()
        db.refresh(recording)
        return recording
    
    @staticmethod
    def get_by_id(db: Session, recording_id: int) -> Optional[Recording]:
        return db.query(Recording).filter(Recording.id == recording_id).first()
    
    @staticmethod
    def get_by_chunk(db: Session, chunk_id: int, page_number: int = 1, limit: int = 100) -> Tuple[List[Recording], int]:
        skip = (page_number - 1) * limit
        total = db.query(Recording).filter(Recording.chunk_id == chunk_id).count()
        items = db.query(Recording).filter(Recording.chunk_id == chunk_id).offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def get_by_speaker(db: Session, speaker_id: int, page_number: int = 1, limit: int = 100) -> Tuple[List[Recording], int]:
        skip = (page_number - 1) * limit
        total = db.query(Recording).filter(Recording.speaker_id == speaker_id).count()
        items = db.query(Recording).filter(Recording.speaker_id == speaker_id).offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def get_by_chunk_and_speaker(
        db: Session,
        chunk_id: int,
        speaker_id: int
    ) -> Optional[Recording]:
        return db.query(Recording).filter(
            Recording.chunk_id == chunk_id,
            Recording.speaker_id == speaker_id
        ).first()
    
    @staticmethod
    def delete(db: Session, recording: Recording) -> None:
        db.delete(recording)
        db.commit()

