"""add comparison sessions table

Revision ID: f1d0a7781f11
Revises: c90a8f2ab321
Create Date: 2026-05-06 16:05:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "f1d0a7781f11"
down_revision: Union[str, None] = "c90a8f2ab321"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comparison_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("aspect_ratio", sa.String(length=10), nullable=False),
        sa.Column("integrated_text", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("share_slug", sa.String(length=64), nullable=False),
        sa.Column("requested_tiers", sa.JSON(), nullable=False),
        sa.Column("variants_json", sa.JSON(), nullable=False),
        sa.Column("charged_credits", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("share_slug"),
    )
    op.create_index(
        op.f("ix_comparison_sessions_status"),
        "comparison_sessions",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_comparison_sessions_share_slug"),
        "comparison_sessions",
        ["share_slug"],
        unique=True,
    )
    op.create_index(
        op.f("ix_comparison_sessions_user_id"),
        "comparison_sessions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_comparison_sessions_user_id"), table_name="comparison_sessions")
    op.drop_index(op.f("ix_comparison_sessions_share_slug"), table_name="comparison_sessions")
    op.drop_index(op.f("ix_comparison_sessions_status"), table_name="comparison_sessions")
    op.drop_table("comparison_sessions")
