"""add_canvas_schema_version_columns

Revision ID: c3d4e5f60718
Revises: 9b2f7c1d4e8a
Create Date: 2026-03-23 13:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f60718"
down_revision: Union[str, None] = "9b2f7c1d4e8a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "canvas_schema_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )
    op.add_column(
        "design_history",
        sa.Column(
            "canvas_schema_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )


def downgrade() -> None:
    op.drop_column("design_history", "canvas_schema_version")
    op.drop_column("projects", "canvas_schema_version")