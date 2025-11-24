"""add_performance_indexes

Revision ID: fde50eb28574
Revises: f6a7f1faf29b
Create Date: 2025-11-24 08:51:23.695755

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fde50eb28574'
down_revision: Union[str, None] = 'f6a7f1faf29b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Индексы для таблицы recordings - критично для производительности запросов
    # Составной индекс для самого частого запроса: поиск записи по chunk_id и speaker_id
    op.create_index(
        'ix_recordings_chunk_speaker',
        'recordings',
        ['chunk_id', 'speaker_id'],
        unique=False
    )
    
    # Индекс для поиска всех записей спикера
    op.create_index(
        'ix_recordings_speaker_id',
        'recordings',
        ['speaker_id'],
        unique=False
    )
    
    # Индекс для поиска всех записей чанка
    op.create_index(
        'ix_recordings_chunk_id',
        'recordings',
        ['chunk_id'],
        unique=False
    )
    
    # Индекс для фильтрации по дате создания (для статистики)
    op.create_index(
        'ix_recordings_created_at',
        'recordings',
        ['created_at'],
        unique=False
    )
    
    # Индексы для таблицы chunks
    # Индекс для поиска всех чанков книги
    op.create_index(
        'ix_chunks_book_id',
        'chunks',
        ['book_id'],
        unique=False
    )
    
    # Составной индекс для сортировки чанков по порядку в книге
    op.create_index(
        'ix_chunks_book_order',
        'chunks',
        ['book_id', 'order_index'],
        unique=False
    )
    
    # Индекс для таблицы book_speaker_assignments
    # Индекс для поиска всех книг спикера (если еще нет)
    op.create_index(
        'ix_book_speaker_assignments_speaker_id',
        'book_speaker_assignments',
        ['speaker_id'],
        unique=False
    )
    
    # Индекс для поиска всех спикеров книги (если еще нет)
    op.create_index(
        'ix_book_speaker_assignments_book_id',
        'book_speaker_assignments',
        ['book_id'],
        unique=False
    )


def downgrade() -> None:
    # Удаляем индексы в обратном порядке
    op.drop_index('ix_book_speaker_assignments_book_id', table_name='book_speaker_assignments')
    op.drop_index('ix_book_speaker_assignments_speaker_id', table_name='book_speaker_assignments')
    op.drop_index('ix_chunks_book_order', table_name='chunks')
    op.drop_index('ix_chunks_book_id', table_name='chunks')
    op.drop_index('ix_recordings_created_at', table_name='recordings')
    op.drop_index('ix_recordings_chunk_id', table_name='recordings')
    op.drop_index('ix_recordings_speaker_id', table_name='recordings')
    op.drop_index('ix_recordings_chunk_speaker', table_name='recordings')



