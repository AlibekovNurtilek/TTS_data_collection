from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class PeriodStatsItem(BaseModel):
    """Статистика за период (день/неделя)"""
    date: str  # Дата в формате YYYY-MM-DD
    duration_hours: float
    recordings_count: int


class BookStatsItem(BaseModel):
    """Статистика по книге"""
    book_id: int
    book_title: str
    duration_hours: float
    recordings_count: int


class CategoryStatsItem(BaseModel):
    """Статистика по категории"""
    category_id: int
    category_name: str
    duration_hours: float
    recordings_count: int


class SpeakerStatsItem(BaseModel):
    """Статистика по спикеру (для админа)"""
    speaker_id: int
    speaker_username: str
    duration_hours: float
    recordings_count: int


class SpeakerStatisticsResponse(BaseModel):
    """Ответ со статистикой для спикера"""
    total_duration_hours: float
    total_recordings: int
    by_period: List[PeriodStatsItem] = []
    by_book: List[BookStatsItem] = []
    by_category: List[CategoryStatsItem] = []


class AdminStatisticsResponse(BaseModel):
    """Ответ со статистикой для админа"""
    total_duration_hours: float
    total_recordings: int
    total_speakers: int
    by_period: List[PeriodStatsItem] = []
    by_speaker: List[SpeakerStatsItem] = []
    by_book: List[BookStatsItem] = []
    by_category: List[CategoryStatsItem] = []


