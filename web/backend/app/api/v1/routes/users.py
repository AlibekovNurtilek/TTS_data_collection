from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UsersPaginatedResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("", response_model=UsersPaginatedResponse, status_code=status.HTTP_200_OK)
async def get_users(
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить список всех пользователей с пагинацией (только для админа)"""
    user_service = UserService(db)
    users, total = user_service.get_all_users(page_number=pageNumber, limit=limit)
    return UsersPaginatedResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        pageNumber=pageNumber,
        limit=limit
    )


@router.get("/{user_id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить пользователя по ID (только для админа)"""
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Создать нового пользователя (только для админа)"""
    user_service = UserService(db)
    new_user = user_service.create_user(user_data)
    return UserResponse.model_validate(new_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Удалить пользователя (только для админа)"""
    user_service = UserService(db)
    user_service.delete_user(user_id)
    return None



