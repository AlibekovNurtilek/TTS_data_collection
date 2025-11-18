from sqlalchemy.orm import Session
from typing import List, Optional
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
    def get_by_chunk(db: Session, chunk_id: int) -> List[Recording]:
        return db.query(Recording).filter(Recording.chunk_id == chunk_id).all()
    
    @staticmethod
    def get_by_speaker(db: Session, speaker_id: int) -> List[Recording]:
        return db.query(Recording).filter(Recording.speaker_id == speaker_id).all()
    
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

