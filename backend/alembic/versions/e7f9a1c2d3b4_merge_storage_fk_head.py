"""Merge heads after storage FK cascade migration.

Revision ID: e7f9a1c2d3b4
Revises: ab12cd34ef56, c9e3f5b2a1d8
Create Date: 2026-04-27 12:10:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "e7f9a1c2d3b4"
down_revision: Union[str, Sequence[str], None] = ("ab12cd34ef56", "c9e3f5b2a1d8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge revision has no schema changes."""
    pass


def downgrade() -> None:
    """Merge revision has no schema changes."""
    pass
