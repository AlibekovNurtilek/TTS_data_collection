from pydantic import BaseModel
from typing import List, Generic, TypeVar

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Единая схема для пагинированного ответа"""
    items: List[T]
    total: int
    pageNumber: int
    limit: int

    class Config:
        from_attributes = True

