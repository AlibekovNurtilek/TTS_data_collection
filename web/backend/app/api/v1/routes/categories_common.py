from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.category import CategoryResponse, CategoriesPaginatedResponse
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("/", response_model=CategoriesPaginatedResponse, status_code=status.HTTP_200_OK)
async def get_categories(
    pageNumber: int = Query(default=1, ge=1, description="Номер страницы"),
    limit: int = Query(default=100, ge=1, le=1000, description="Количество записей на странице"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить список всех категорий с пагинацией.
    Доступно для всех авторизованных пользователей (админы и спикеры).
    """
    category_service = CategoryService(db)
    categories, total = category_service.get_all_categories(page_number=pageNumber, limit=limit)
    return CategoriesPaginatedResponse(
        items=[CategoryResponse.model_validate(cat) for cat in categories],
        total=total,
        pageNumber=pageNumber,
        limit=limit
    )

