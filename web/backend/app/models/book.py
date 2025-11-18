from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Импортируем промежуточную таблицу для relationships
from app.models.book_speaker_assignment import book_speaker_assignment


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="books")
    chunks = relationship("Chunk", back_populates="book", cascade="all, delete-orphan")
    assigned_speakers = relationship(
        "User",
        secondary=book_speaker_assignment,
        back_populates="assigned_books"
    )



