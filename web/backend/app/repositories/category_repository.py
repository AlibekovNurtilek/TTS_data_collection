from sqlalchemy.orm import Session
from typing import List, Tuple
from app.models.category import Category


class CategoryRepository:
    @staticmethod
    def get_all(db: Session, page_number: int = 1, limit: int = 100) -> Tuple[List[Category], int]:
        skip = (page_number - 1) * limit
        total = db.query(Category).count()
        items = db.query(Category).offset(skip).limit(limit).all()
        return items, total
    
    @staticmethod
    def get_by_id(db: Session, category_id: int) -> Category | None:
        return db.query(Category).filter(Category.id == category_id).first()
    
    @staticmethod
    def get_by_name(db: Session, name: str) -> Category | None:
        return db.query(Category).filter(Category.name == name).first()
    
    @staticmethod
    def create(db: Session, category: Category) -> Category:
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    
    @staticmethod
    def update(db: Session, category: Category) -> Category:
        db.commit()
        db.refresh(category)
        return category
    
    @staticmethod
    def delete(db: Session, category: Category) -> None:
        db.delete(category)
        db.commit()



