from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.core.security import get_password_hash
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository()
    
    def get_all_users(self, page_number: int = 1, limit: int = 100) -> tuple[List[User], int]:
        return self.user_repo.get_all(self.db, page_number=page_number, limit=limit)
    
    def get_user_by_id(self, user_id: int) -> User:
        user = self.user_repo.get_by_id(self.db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user
    
    def create_user(self, user_data: UserCreate) -> User:
        # Проверяем, существует ли пользователь с таким username
        existing_user = self.user_repo.get_by_username(self.db, user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )
        
        # Всегда создаем пользователя как speaker
        new_user = User(
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
            role=UserRole.SPEAKER
        )
        return self.user_repo.create(self.db, new_user)
    
    def delete_user(self, user_id: int) -> None:
        user = self.get_user_by_id(user_id)
        # Запрещаем удаление админа
        if user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete admin user",
            )
        self.user_repo.delete(self.db, user)



