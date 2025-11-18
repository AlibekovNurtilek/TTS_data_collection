from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.security import verify_token
from app.database import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.book_assignment_repository import BookAssignmentRepository
from app.models.user import User, UserRole


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    # Читаем токен из cookies
    token = request.cookies.get("access_token")
    
    # Также проверяем заголовок Authorization на случай, если cookie не работает
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    payload = verify_token(token)
    user_id: int = int(payload.get("sub"))
    
    user_repo = UserRepository()
    user = user_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


def verify_book_access(book_id: int, current_user: User, db: Session) -> None:
    """
    Проверить доступ пользователя к книге.
    Админы имеют доступ ко всем книгам.
    Спикеры имеют доступ только к назначенным им книгам.
    Вызывает HTTPException если доступ запрещен.
    """
    # Админы имеют доступ ко всем книгам
    if current_user.role == UserRole.ADMIN:
        return
    
    # Спикеры имеют доступ только к назначенным им книгам
    if current_user.role == UserRole.SPEAKER:
        assignment_repo = BookAssignmentRepository()
        if assignment_repo.is_assigned(db, book_id, current_user.id):
            return
    
    # Если пользователь не админ и книга не назначена - запретить доступ
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this book",
    )

