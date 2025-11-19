from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    text = Column(Text, nullable=False)
    order_index = Column(Integer, nullable=False)  # Порядок в книге
    estimated_duration = Column(Integer, nullable=True)  # Оценка длительности в секундах
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    book = relationship("Book", back_populates="chunks")
    recordings = relationship("Recording", back_populates="chunk", cascade="all, delete-orphan")



