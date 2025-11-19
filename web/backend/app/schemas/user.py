from pydantic import BaseModel
from app.models.user import UserRole
from app.schemas.pagination import PaginatedResponse


class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.SPEAKER


class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    role: UserRole | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole

    class Config:
        from_attributes = True


class UsersPaginatedResponse(PaginatedResponse[UserResponse]):
    """Пагинированный ответ для пользователей"""
    pass



