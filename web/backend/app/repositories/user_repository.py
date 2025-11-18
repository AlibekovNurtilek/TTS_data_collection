from sqlalchemy.orm import Session
from typing import List
from app.models.user import User


class UserRepository:
    @staticmethod
    def get_by_username(db: Session, username: str) -> User | None:
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def create(db: Session, user: User) -> User:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def delete(db: Session, user: User) -> None:
        # Use bulk delete to bypass relationship loading
        # This prevents SQLAlchemy from trying to query related tables that might not exist
        db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
        db.commit()

