"""merge variation_results and referral/comparison heads

Revision ID: b024148e33ee
Revises: c1b2d3e4f5a6, e4bcba560941
Create Date: 2026-05-10 13:09:10.588851

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b024148e33ee'
down_revision: Union[str, None] = ('c1b2d3e4f5a6', 'e4bcba560941')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
