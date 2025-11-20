from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import datetime, timedelta
from app.models.recording import Recording
from app.models.chunk import Chunk
from app.models.book import Book
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.statistics import (
    SpeakerStatisticsResponse,
    AdminStatisticsResponse,
    PeriodStatsItem,
    BookStatsItem,
    CategoryStatsItem,
    SpeakerStatsItem
)


class StatisticsService:
    def __init__(self, db: Session):
        self.db = db
    
    def _apply_date_filter(self, query, period, start_date, end_date):
        """Применить фильтр по дате к запросу"""
        if period == "day":
            today = datetime.now().date()
            return query.filter(func.date(Recording.created_at) == today)
        elif period == "week":
            week_ago = datetime.now() - timedelta(days=7)
            return query.filter(Recording.created_at >= week_ago)
        elif period == "month":
            month_ago = datetime.now() - timedelta(days=30)
            return query.filter(Recording.created_at >= month_ago)
        elif period == "custom" and start_date and end_date:
            return query.filter(
                and_(
                    Recording.created_at >= start_date,
                    Recording.created_at <= end_date
                )
            )
        return query
    
    def get_speaker_statistics(
        self,
        speaker_id: int,
        period: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> SpeakerStatisticsResponse:
        """Получить статистику для спикера."""
        # Базовый запрос для записей спикера
        base_query = self.db.query(Recording).filter(
            Recording.speaker_id == speaker_id
        )
        
        # Применяем фильтр по дате
        base_query = self._apply_date_filter(base_query, period, start_date, end_date)
        
        # Общая статистика
        total_recordings = base_query.count()
        total_duration = base_query.with_entities(
            func.sum(Recording.duration)
        ).scalar() or 0.0
        total_duration_hours = total_duration / 3600.0
        
        # Статистика по периодам (по дням)
        period_stats = []
        if period in ["week", "month", "custom"] or period is None:
            date_query = self.db.query(Recording).filter(
                Recording.speaker_id == speaker_id
            )
            date_query = self._apply_date_filter(date_query, period, start_date, end_date)
            
            date_stats = date_query.with_entities(
                func.date(Recording.created_at).label('date'),
                func.sum(Recording.duration).label('total_duration'),
                func.count(Recording.id).label('count')
            ).group_by(func.date(Recording.created_at)).all()
            
            for date, duration, count in date_stats:
                period_stats.append(PeriodStatsItem(
                    date=date.isoformat() if isinstance(date, datetime) else str(date),
                    duration_hours=(duration or 0) / 3600.0,
                    recordings_count=count
                ))
        
        # Статистика по книгам
        book_stats = []
        book_query = self.db.query(
            Book.id,
            Book.title,
            func.sum(Recording.duration).label('total_duration'),
            func.count(Recording.id).label('count')
        ).join(
            Chunk, Book.id == Chunk.book_id
        ).join(
            Recording, Chunk.id == Recording.chunk_id
        ).filter(
            Recording.speaker_id == speaker_id
        )
        book_query = self._apply_date_filter(book_query, period, start_date, end_date)
        book_results = book_query.group_by(Book.id, Book.title).all()
        
        for book_id, book_title, duration, count in book_results:
            book_stats.append(BookStatsItem(
                book_id=book_id,
                book_title=book_title,
                duration_hours=(duration or 0) / 3600.0,
                recordings_count=count
            ))
        
        # Статистика по категориям
        category_stats = []
        category_query = self.db.query(
            Category.id,
            Category.name,
            func.sum(Recording.duration).label('total_duration'),
            func.count(Recording.id).label('count')
        ).join(
            Book, Category.id == Book.category_id
        ).join(
            Chunk, Book.id == Chunk.book_id
        ).join(
            Recording, Chunk.id == Recording.chunk_id
        ).filter(
            Recording.speaker_id == speaker_id
        )
        category_query = self._apply_date_filter(category_query, period, start_date, end_date)
        category_results = category_query.group_by(Category.id, Category.name).all()
        
        for category_id, category_name, duration, count in category_results:
            category_stats.append(CategoryStatsItem(
                category_id=category_id,
                category_name=category_name,
                duration_hours=(duration or 0) / 3600.0,
                recordings_count=count
            ))
        
        return SpeakerStatisticsResponse(
            total_duration_hours=total_duration_hours,
            total_recordings=total_recordings,
            by_period=period_stats,
            by_book=book_stats,
            by_category=category_stats
        )
    
    def get_admin_statistics(
        self,
        period: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        speaker_id: Optional[int] = None,
        book_id: Optional[int] = None,
        category_id: Optional[int] = None
    ) -> AdminStatisticsResponse:
        """Получить статистику для админа (по всем пользователям)."""
        # Базовый запрос
        base_query = self.db.query(Recording)
        
        # Фильтр по спикеру
        if speaker_id:
            base_query = base_query.filter(Recording.speaker_id == speaker_id)
        
        # Применяем фильтр по дате
        base_query = self._apply_date_filter(base_query, period, start_date, end_date)
        
        # Общая статистика
        total_recordings = base_query.count()
        total_duration = base_query.with_entities(
            func.sum(Recording.duration)
        ).scalar() or 0.0
        total_duration_hours = total_duration / 3600.0
        
        # Количество уникальных спикеров
        total_speakers = base_query.with_entities(
            func.count(func.distinct(Recording.speaker_id))
        ).scalar() or 0
        
        # Статистика по периодам (по дням)
        period_stats = []
        if period in ["week", "month", "custom"] or period is None:
            date_query = self.db.query(Recording)
            if speaker_id:
                date_query = date_query.filter(Recording.speaker_id == speaker_id)
            date_query = self._apply_date_filter(date_query, period, start_date, end_date)
            
            date_stats = date_query.with_entities(
                func.date(Recording.created_at).label('date'),
                func.sum(Recording.duration).label('total_duration'),
                func.count(Recording.id).label('count')
            ).group_by(func.date(Recording.created_at)).all()
            
            for date, duration, count in date_stats:
                period_stats.append(PeriodStatsItem(
                    date=date.isoformat() if isinstance(date, datetime) else str(date),
                    duration_hours=(duration or 0) / 3600.0,
                    recordings_count=count
                ))
        
        # Статистика по спикерам
        speaker_stats = []
        speaker_query = self.db.query(
            User.id,
            User.username,
            func.sum(Recording.duration).label('total_duration'),
            func.count(Recording.id).label('count')
        ).join(
            Recording, User.id == Recording.speaker_id
        )
        
        if speaker_id:
            speaker_query = speaker_query.filter(Recording.speaker_id == speaker_id)
        if book_id:
            speaker_query = speaker_query.join(Chunk, Recording.chunk_id == Chunk.id).filter(
                Chunk.book_id == book_id
            )
        if category_id:
            speaker_query = speaker_query.join(Chunk, Recording.chunk_id == Chunk.id).join(
                Book, Chunk.book_id == Book.id
            ).filter(Book.category_id == category_id)
        
        speaker_query = self._apply_date_filter(speaker_query, period, start_date, end_date)
        speaker_results = speaker_query.group_by(User.id, User.username).all()
        
        for user_id, username, duration, count in speaker_results:
            speaker_stats.append(SpeakerStatsItem(
                speaker_id=user_id,
                speaker_username=username,
                duration_hours=(duration or 0) / 3600.0,
                recordings_count=count
            ))
        
        # Статистика по книгам
        book_stats = []
        book_query = self.db.query(
            Book.id,
            Book.title,
            func.sum(Recording.duration).label('total_duration'),
            func.count(Recording.id).label('count')
        ).join(
            Chunk, Book.id == Chunk.book_id
        ).join(
            Recording, Chunk.id == Recording.chunk_id
        )
        
        if speaker_id:
            book_query = book_query.filter(Recording.speaker_id == speaker_id)
        if book_id:
            book_query = book_query.filter(Book.id == book_id)
        if category_id:
            book_query = book_query.filter(Book.category_id == category_id)
        
        book_query = self._apply_date_filter(book_query, period, start_date, end_date)
        book_results = book_query.group_by(Book.id, Book.title).all()
        
        for book_id, book_title, duration, count in book_results:
            book_stats.append(BookStatsItem(
                book_id=book_id,
                book_title=book_title,
                duration_hours=(duration or 0) / 3600.0,
                recordings_count=count
            ))
        
        # Статистика по категориям
        category_stats = []
        category_query = self.db.query(
            Category.id,
            Category.name,
            func.sum(Recording.duration).label('total_duration'),
            func.count(Recording.id).label('count')
        ).join(
            Book, Category.id == Book.category_id
        ).join(
            Chunk, Book.id == Chunk.book_id
        ).join(
            Recording, Chunk.id == Recording.chunk_id
        )
        
        if speaker_id:
            category_query = category_query.filter(Recording.speaker_id == speaker_id)
        if book_id:
            category_query = category_query.filter(Book.id == book_id)
        if category_id:
            category_query = category_query.filter(Category.id == category_id)
        
        category_query = self._apply_date_filter(category_query, period, start_date, end_date)
        category_results = category_query.group_by(Category.id, Category.name).all()
        
        for category_id, category_name, duration, count in category_results:
            category_stats.append(CategoryStatsItem(
                category_id=category_id,
                category_name=category_name,
                duration_hours=(duration or 0) / 3600.0,
                recordings_count=count
            ))
        
        return AdminStatisticsResponse(
            total_duration_hours=total_duration_hours,
            total_recordings=total_recordings,
            total_speakers=total_speakers,
            by_period=period_stats,
            by_speaker=speaker_stats,
            by_book=book_stats,
            by_category=category_stats
        )
