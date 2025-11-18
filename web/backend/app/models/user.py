from sqlalchemy import Column, Integer, String, Enum, Table, ForeignKey
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SPEAKER = "speaker"


# Импортируем промежуточную таблицу для relationships
from app.models.book_speaker_assignment import book_speaker_assignment


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SPEAKER)

    # Relationships
    assigned_books = relationship(
        "Book",
        secondary=book_speaker_assignment,
        back_populates="assigned_speakers"
    )
    recordings = relationship(
        "Recording", 
        back_populates="speaker",
        passive_deletes=True,
        lazy="noload"
    )

