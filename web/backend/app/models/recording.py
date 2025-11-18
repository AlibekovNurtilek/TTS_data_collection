from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    chunk_id = Column(Integer, ForeignKey("chunks.id"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    audio_file_path = Column(String, nullable=False)
    duration = Column(Float, nullable=True)  # Длительность в секундах
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    chunk = relationship("Chunk", back_populates="recordings")
    speaker = relationship("User", back_populates="recordings")

