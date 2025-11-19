from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user
from app.models.user import User
from app.schemas.book_assignment import (
    BookAssignmentCreate,
    BookAssignmentResponse,
    BookWithSpeakersResponse,
    SpeakerWithBooksResponse,
    SpeakerInfo
)
from app.schemas.user import UserResponse, UsersPaginatedResponse
from app.services.book_assignment_service import BookAssignmentService

router = APIRouter()


@router.post("/assign", response_model=BookAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_book_to_speaker(
    assignment: BookAssignmentCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Назначить книгу спикеру (только для админа)"""
    assignment_service = BookAssignmentService(db)
    assignment_service.assign_book_to_speaker(assignment.book_id, assignment.speaker_id)
    
    # Возвращаем информацию о назначении
    # Для этого нужно получить запись из таблицы назначений
    from app.models.book_speaker_assignment import book_speaker_assignment
    from sqlalchemy import and_, select
    
    stmt = select(book_speaker_assignment).where(
        and_(
            book_speaker_assignment.c.book_id == assignment.book_id,
            book_speaker_assignment.c.speaker_id == assignment.speaker_id
        )
    )
    result = db.execute(stmt).first()
    
    return BookAssignmentResponse(
        id=result.id,
        book_id=result.book_id,
        speaker_id=result.speaker_id,
        assigned_at=result.assigned_at
    )


@router.delete("/assign/{book_id}/{speaker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_assignment(
    book_id: int,
    speaker_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Удалить назначение книги спикеру (только для админа)"""
    assignment_service = BookAssignmentService(db)
    assignment_service.remove_assignment(book_id, speaker_id)
    return None


@router.get("/book/{book_id}/speakers", response_model=BookWithSpeakersResponse, status_code=status.HTTP_200_OK)
async def get_book_with_speakers(
    book_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить книгу со списком назначенных спикеров (только для админа)"""
    assignment_service = BookAssignmentService(db)
    return assignment_service.get_book_with_speakers(book_id)


@router.get("/speaker/{speaker_id}/books", response_model=SpeakerWithBooksResponse, status_code=status.HTTP_200_OK)
async def get_speaker_with_books(
    speaker_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить спикера со списком назначенных книг (только для админа)"""
    assignment_service = BookAssignmentService(db)
    return assignment_service.get_speaker_with_books(speaker_id)


@router.get("/speakers", response_model=UsersPaginatedResponse, status_code=status.HTTP_200_OK)
async def get_all_speakers(
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить список всех спикеров с пагинацией (только для админа)"""
    assignment_service = BookAssignmentService(db)
    speakers, total = assignment_service.get_all_speakers(page_number=pageNumber, limit=limit)
    return UsersPaginatedResponse(
        items=[UserResponse.model_validate(speaker) for speaker in speakers],
        total=total,
        pageNumber=pageNumber,
        limit=limit
    )



