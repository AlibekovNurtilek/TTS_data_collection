from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.book_assignment import SpeakerWithBooksResponse
from app.services.book_assignment_service import BookAssignmentService

router = APIRouter()


@router.get("/my-books", response_model=SpeakerWithBooksResponse, status_code=status.HTTP_200_OK)
async def get_my_assigned_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить книги, назначенные текущему пользователю (для всех авторизованных пользователей)"""
    assignment_service = BookAssignmentService(db)
    return assignment_service.get_user_with_books(current_user.id)

