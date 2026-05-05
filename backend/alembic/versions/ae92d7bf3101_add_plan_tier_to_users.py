"""add plan_tier to users

Revision ID: ae92d7bf3101
Revises: 6b31c6d9d001
Create Date: 2026-05-06 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ae92d7bf3101"
down_revision: Union[str, None] = "6b31c6d9d001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "plan_tier",
            sa.String(),
            nullable=False,
            server_default="starter",
        ),
    )
    op.execute("UPDATE users SET plan_tier = 'starter' WHERE plan_tier IS NULL")
    op.alter_column("users", "plan_tier", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "plan_tier")
