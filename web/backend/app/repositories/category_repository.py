from sqlalchemy.orm import Session
from typing import List
from app.models.category import Category


class CategoryRepository:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
        return db.query(Category).offset(skip).limit(limit).all()
    
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



