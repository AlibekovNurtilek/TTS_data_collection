from sqlalchemy import Column, Integer, ForeignKey, DateTime, Table
from sqlalchemy.sql import func
from app.database import Base

# Промежуточная таблица для связи многие-ко-многим между Book и User (speaker)
book_speaker_assignment = Table(
    "book_speaker_assignments",
    Base.metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False),
    Column("speaker_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("assigned_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)

