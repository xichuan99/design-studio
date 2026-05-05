"""add testimonials table

Revision ID: c90a8f2ab321
Revises: ae92d7bf3101
Create Date: 2026-05-06 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c90a8f2ab321"
down_revision: Union[str, None] = "ae92d7bf3101"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "testimonials",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_testimonials_status"), "testimonials", ["status"], unique=False)
    op.create_index(op.f("ix_testimonials_user_id"), "testimonials", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_testimonials_user_id"), table_name="testimonials")
    op.drop_index(op.f("ix_testimonials_status"), table_name="testimonials")
    op.drop_table("testimonials")
