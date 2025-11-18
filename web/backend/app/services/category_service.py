from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List

from app.models.category import Category
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.category_repo = CategoryRepository()
    
    def get_all_categories(self, skip: int = 0, limit: int = 100) -> List[Category]:
        return self.category_repo.get_all(self.db, skip=skip, limit=limit)
    
    def get_category_by_id(self, category_id: int) -> Category:
        category = self.category_repo.get_by_id(self.db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found",
            )
        return category
    
    def create_category(self, category_data: CategoryCreate) -> Category:
        # Проверяем, существует ли категория с таким именем
        existing = self.category_repo.get_by_name(self.db, category_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )
        
        new_category = Category(
            name=category_data.name,
            description=category_data.description
        )
        return self.category_repo.create(self.db, new_category)
    
    def update_category(self, category_id: int, category_data: CategoryUpdate) -> Category:
        category = self.get_category_by_id(category_id)
        
        if category_data.name and category_data.name != category.name:
            existing = self.category_repo.get_by_name(self.db, category_data.name)
            if existing and existing.id != category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category with this name already exists",
                )
            category.name = category_data.name
        
        if category_data.description is not None:
            category.description = category_data.description
        
        return self.category_repo.update(self.db, category)
    
    def delete_category(self, category_id: int) -> None:
        category = self.get_category_by_id(category_id)
        self.category_repo.delete(self.db, category)



