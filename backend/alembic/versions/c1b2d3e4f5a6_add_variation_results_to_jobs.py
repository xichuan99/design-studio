"""add variation_results to jobs

Revision ID: c1b2d3e4f5a6
Revises: ab12cd34ef56
Create Date: 2026-05-10 09:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1b2d3e4f5a6"
down_revision: Union[str, None] = "ab12cd34ef56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("variation_results", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "variation_results")
