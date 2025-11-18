from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.book import BookResponse, BookWithChunksResponse, BookUpload
from app.services.book_service import BookService

router = APIRouter()


@router.get("/", response_model=List[BookResponse], status_code=status.HTTP_200_OK)
async def get_books(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить список всех книг (только для админа)"""
    book_service = BookService(db)
    if category_id:
        books = book_service.get_books_by_category(category_id, skip=skip, limit=limit)
    else:
        books = book_service.get_all_books(skip=skip, limit=limit)
    return [BookResponse.model_validate(book) for book in books]


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
