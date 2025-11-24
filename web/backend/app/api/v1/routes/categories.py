from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoriesPaginatedResponse
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("", response_model=CategoriesPaginatedResponse, status_code=status.HTTP_200_OK)
async def get_categories(
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить список всех категорий с пагинацией (только для админа)"""
    category_service = CategoryService(db)
    categories, total = category_service.get_all_categories(page_number=pageNumber, limit=limit)
    return CategoriesPaginatedResponse(
        items=[CategoryResponse.model_validate(cat) for cat in categories],
        total=total,
        pageNumber=pageNumber,
        limit=limit
    )


@router.get("/{category_id}", response_model=CategoryResponse, status_code=status.HTTP_200_OK)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить категорию по ID (только для админа)"""
    category_service = CategoryService(db)
    category = category_service.get_category_by_id(category_id)
    return CategoryResponse.model_validate(category)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Создать новую категорию (только для админа)"""
    category_service = CategoryService(db)
    new_category = category_service.create_category(category_data)
    return CategoryResponse.model_validate(new_category)


@router.put("/{category_id}", response_model=CategoryResponse, status_code=status.HTTP_200_OK)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Обновить категорию (только для админа)"""
    category_service = CategoryService(db)
    updated_category = category_service.update_category(category_id, category_data)
    return CategoryResponse.model_validate(updated_category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Удалить категорию (только для админа)"""
    category_service = CategoryService(db)
    category_service.delete_category(category_id)
    return None



