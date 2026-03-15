"""Add storage quota fields to users

Revision ID: f7a2b3c4d5e6
Revises: e3f9a83f5cc6
Create Date: 2026-03-15 09:37:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a2b3c4d5e6"
down_revision: Union[str, None] = "e3f9a83f5cc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "storage_used",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "storage_quota",
            sa.BigInteger(),
            nullable=False,
            server_default="104857600",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "storage_quota")
    op.drop_column("users", "storage_used")
