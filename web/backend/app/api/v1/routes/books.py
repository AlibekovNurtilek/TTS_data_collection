from fastapi import APIRouter, Depends, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.book import BookResponse, BookWithChunksResponse, BookUpload, BooksPaginatedResponse
from app.services.book_service import BookService

router = APIRouter()


@router.get("/", response_model=BooksPaginatedResponse, status_code=status.HTTP_200_OK)
async def get_books(
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    category_id: Optional[int] = Query(default=None, description="ID категории для фильтрации"),
    speaker_id: Optional[int] = Query(default=None, description="ID спикера для фильтрации"),
    search: Optional[str] = Query(default=None, description="Поиск по названию книги"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить список всех книг с пагинацией, фильтрацией и поиском (только для админа)"""
    book_service = BookService(db)
    books, total = book_service.get_all_books(
        page_number=pageNumber,
        limit=limit,
        category_id=category_id,
        speaker_id=speaker_id,
        search=search
    )
    
    return BooksPaginatedResponse(
        items=[BookResponse.model_validate(book) for book in books],
        total=total,
        pageNumber=pageNumber,
        limit=limit
    )


@router.get("/{book_id}", response_model=BookResponse, status_code=status.HTTP_200_OK)
async def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить книгу по ID (только для админа)"""
    book_service = BookService(db)
    book = book_service.get_book_by_id(book_id)
    return BookResponse.model_validate(book)


@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile = File(...),
    category_id: int = Form(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Загрузить новую книгу (только для админа)"""
    book_service = BookService(db)
    book = await book_service.upload_book(file, category_id, title)
    return BookResponse.model_validate(book)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Удалить книгу (только для админа)"""
    book_service = BookService(db)
    book_service.delete_book(book_id)
    return None
