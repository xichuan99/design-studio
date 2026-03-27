"""add seed to jobs

Revision ID: 3e608fbc176a
Revises: 2d0a6bc84a55
Create Date: 2026-03-27 11:13:42.297382

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e608fbc176a'
down_revision: Union[str, None] = '2d0a6bc84a55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('seed', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'seed')
