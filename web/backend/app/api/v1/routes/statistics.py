from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.user import User, UserRole
from app.schemas.statistics import SpeakerStatisticsResponse, AdminStatisticsResponse
from app.services.statistics_service import StatisticsService

router = APIRouter()


@router.get(
    "/me",
    response_model=SpeakerStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_statistics(
    period: Optional[str] = Query(
        default=None,
        description="Период: day - сегодня, week - последняя неделя, month - последний месяц, custom - произвольный период"
    ),
    start_date: Optional[str] = Query(
        default=None,
        description="Начальная дата для custom периода (формат: YYYY-MM-DD)"
    ),
    end_date: Optional[str] = Query(
        default=None,
        description="Конечная дата для custom периода (формат: YYYY-MM-DD)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить статистику для текущего спикера.
    
    - **period**: Период (day/week/month/custom)
    - **start_date**: Начальная дата для custom (YYYY-MM-DD)
    - **end_date**: Конечная дата для custom (YYYY-MM-DD)
    """
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    # Парсим даты если указаны
    start_dt = None
    end_dt = None
    if period == "custom":
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD"
                )
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                # Добавляем время конца дня
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD"
                )
    
    statistics_service = StatisticsService(db)
    return statistics_service.get_speaker_statistics(
        speaker_id=current_user.id,
        period=period,
        start_date=start_dt,
        end_date=end_dt
    )


@router.get(
    "/admin",
    response_model=AdminStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_statistics(
    period: Optional[str] = Query(
        default=None,
        description="Период: day - сегодня, week - последняя неделя, month - последний месяц, custom - произвольный период"
    ),
    start_date: Optional[str] = Query(
        default=None,
        description="Начальная дата для custom периода (формат: YYYY-MM-DD)"
    ),
    end_date: Optional[str] = Query(
        default=None,
        description="Конечная дата для custom периода (формат: YYYY-MM-DD)"
    ),
    speaker_id: Optional[int] = Query(
        default=None,
        description="Фильтр по спикеру"
    ),
    book_id: Optional[int] = Query(
        default=None,
        description="Фильтр по книге"
    ),
    category_id: Optional[int] = Query(
        default=None,
        description="Фильтр по категории"
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Получить статистику для админа (по всем пользователям).
    
    - **period**: Период (day/week/month/custom)
    - **start_date**: Начальная дата для custom (YYYY-MM-DD)
    - **end_date**: Конечная дата для custom (YYYY-MM-DD)
    - **speaker_id**: Фильтр по спикеру
    - **book_id**: Фильтр по книге
    - **category_id**: Фильтр по категории
    """
    # Парсим даты если указаны
    start_dt = None
    end_dt = None
    if period == "custom":
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD"
                )
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD"
                )
    
    statistics_service = StatisticsService(db)
    return statistics_service.get_admin_statistics(
        period=period,
        start_date=start_dt,
        end_date=end_dt,
        speaker_id=speaker_id,
        book_id=book_id,
        category_id=category_id
    )


@router.get(
    "/me/by-book/{book_id}",
    response_model=SpeakerStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_statistics_by_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику спикера по конкретной книге"""
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    statistics_service = StatisticsService(db)
    stats = statistics_service.get_speaker_statistics(speaker_id=current_user.id)
    
    # Фильтруем только по указанной книге
    filtered_stats = SpeakerStatisticsResponse(
        total_duration_hours=sum(b.duration_hours for b in stats.by_book if b.book_id == book_id),
        total_recordings=sum(b.recordings_count for b in stats.by_book if b.book_id == book_id),
        by_period=[],
        by_book=[b for b in stats.by_book if b.book_id == book_id],
        by_category=[]
    )
    
    return filtered_stats


@router.get(
    "/me/by-category/{category_id}",
    response_model=SpeakerStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_my_statistics_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику спикера по конкретной категории"""
    if current_user.role != UserRole.SPEAKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only speakers can access this endpoint"
        )
    
    statistics_service = StatisticsService(db)
    stats = statistics_service.get_speaker_statistics(speaker_id=current_user.id)
    
    # Фильтруем только по указанной категории
    filtered_stats = SpeakerStatisticsResponse(
        total_duration_hours=sum(c.duration_hours for c in stats.by_category if c.category_id == category_id),
        total_recordings=sum(c.recordings_count for c in stats.by_category if c.category_id == category_id),
        by_period=[],
        by_book=[],
        by_category=[c for c in stats.by_category if c.category_id == category_id]
    )
    
    return filtered_stats


@router.get(
    "/admin/by-speaker/{speaker_id}",
    response_model=AdminStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_statistics_by_speaker(
    speaker_id: int,
    period: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить статистику админа по конкретному спикеру"""
    start_dt = None
    end_dt = None
    if period == "custom":
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start_date format")
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid end_date format")
    
    statistics_service = StatisticsService(db)
    return statistics_service.get_admin_statistics(
        period=period,
        start_date=start_dt,
        end_date=end_dt,
        speaker_id=speaker_id
    )


@router.get(
    "/admin/by-book/{book_id}",
    response_model=AdminStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_statistics_by_book(
    book_id: int,
    period: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить статистику админа по конкретной книге"""
    start_dt = None
    end_dt = None
    if period == "custom":
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start_date format")
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid end_date format")
    
    statistics_service = StatisticsService(db)
    return statistics_service.get_admin_statistics(
        period=period,
        start_date=start_dt,
        end_date=end_dt,
        book_id=book_id
    )


@router.get(
    "/admin/by-category/{category_id}",
    response_model=AdminStatisticsResponse,
    status_code=status.HTTP_200_OK
)
async def get_admin_statistics_by_category(
    category_id: int,
    period: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Получить статистику админа по конкретной категории"""
    start_dt = None
    end_dt = None
    if period == "custom":
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start_date format")
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid end_date format")
    
    statistics_service = StatisticsService(db)
    return statistics_service.get_admin_statistics(
        period=period,
        start_date=start_dt,
        end_date=end_dt,
        category_id=category_id
    )

