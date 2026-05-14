"""add_platform_to_templates

Revision ID: 6bcc67eb49fd
Revises: 704dbd6e314a
Create Date: 2026-05-14 14:25:46.361490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bcc67eb49fd'
down_revision: Union[str, None] = '704dbd6e314a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "templates",
        sa.Column("platform", sa.String(50), nullable=True),
    )
    op.create_index("ix_templates_platform", "templates", ["platform"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_templates_platform", table_name="templates")
    op.drop_column("templates", "platform")
