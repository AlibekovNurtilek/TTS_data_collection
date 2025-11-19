"""remove recorded fields from chunks

Revision ID: f6a7f1faf29b
Revises: 2f27f9ecca49
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7f1faf29b'
down_revision: Union[str, None] = '2f27f9ecca49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Удаляем поля is_recorded и audio_file_path из таблицы chunks
    op.drop_column('chunks', 'is_recorded')
    op.drop_column('chunks', 'audio_file_path')


def downgrade() -> None:
    # Восстанавливаем поля при откате миграции
    op.add_column('chunks', sa.Column('is_recorded', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('chunks', sa.Column('audio_file_path', sa.String(), nullable=True))

