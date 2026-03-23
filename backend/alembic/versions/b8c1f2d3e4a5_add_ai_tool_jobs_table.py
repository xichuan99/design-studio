"""add_ai_tool_jobs_table

Revision ID: b8c1f2d3e4a5
Revises: d5a1f21a0f0e
Create Date: 2026-03-23 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8c1f2d3e4a5"
down_revision: Union[str, None] = "d5a1f21a0f0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_tool_jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tool_name", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("result_url", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("phase_message", sa.String(length=200), nullable=True),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("provider_latency_ms", sa.Integer(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
        sa.Column("cancel_requested", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_ai_tool_jobs_user_id"), "ai_tool_jobs", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_ai_tool_jobs_tool_name"), "ai_tool_jobs", ["tool_name"], unique=False
    )
    op.create_index(
        op.f("ix_ai_tool_jobs_status"), "ai_tool_jobs", ["status"], unique=False
    )
    op.create_index(
        "ix_ai_tool_jobs_user_created_at",
        "ai_tool_jobs",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_tool_jobs_status_created_at",
        "ai_tool_jobs",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "uq_ai_tool_jobs_user_idempotency_key",
        "ai_tool_jobs",
        ["user_id", "idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_ai_tool_jobs_user_idempotency_key", table_name="ai_tool_jobs")
    op.drop_index("ix_ai_tool_jobs_status_created_at", table_name="ai_tool_jobs")
    op.drop_index("ix_ai_tool_jobs_user_created_at", table_name="ai_tool_jobs")
    op.drop_index(op.f("ix_ai_tool_jobs_status"), table_name="ai_tool_jobs")
    op.drop_index(op.f("ix_ai_tool_jobs_tool_name"), table_name="ai_tool_jobs")
    op.drop_index(op.f("ix_ai_tool_jobs_user_id"), table_name="ai_tool_jobs")
    op.drop_table("ai_tool_jobs")
