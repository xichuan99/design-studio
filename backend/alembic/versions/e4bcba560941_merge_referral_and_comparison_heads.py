"""merge referral and comparison heads

Revision ID: e4bcba560941
Revises: de07f9b2c4a1, f1d0a7781f11
Create Date: 2026-05-06 20:16:26.435052

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'e4bcba560941'
down_revision: Union[str, None] = ('de07f9b2c4a1', 'f1d0a7781f11')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
