"""add_ai_usage_events

Revision ID: a8f5d4c3b2a1
Revises: b024148e33ee
Create Date: 2026-05-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a8f5d4c3b2a1"
down_revision: Union[str, None] = "b024148e33ee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("job_id", sa.UUID(), nullable=True),
        sa.Column("ai_tool_job_id", sa.UUID(), nullable=True),
        sa.Column("credit_transaction_id", sa.UUID(), nullable=True),
        sa.Column("refund_transaction_id", sa.UUID(), nullable=True),
        sa.Column("operation", sa.String(length=80), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="backend"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="charged"),
        sa.Column("provider", sa.String(length=80), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=True),
        sa.Column("quality", sa.String(length=40), nullable=True),
        sa.Column("estimated_cost", sa.Numeric(12, 6), nullable=True),
        sa.Column("actual_cost", sa.Numeric(12, 6), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("credits_charged", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("event_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["ai_tool_job_id"], ["ai_tool_jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["credit_transaction_id"], ["credit_transactions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["refund_transaction_id"], ["credit_transactions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_usage_events_user_id"), "ai_usage_events", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_job_id"), "ai_usage_events", ["job_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_ai_tool_job_id"), "ai_usage_events", ["ai_tool_job_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_credit_transaction_id"), "ai_usage_events", ["credit_transaction_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_refund_transaction_id"), "ai_usage_events", ["refund_transaction_id"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_operation"), "ai_usage_events", ["operation"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_status"), "ai_usage_events", ["status"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_provider"), "ai_usage_events", ["provider"], unique=False)
    op.create_index(op.f("ix_ai_usage_events_model"), "ai_usage_events", ["model"], unique=False)
    op.create_index("ix_ai_usage_events_user_created_at", "ai_usage_events", ["user_id", "created_at"], unique=False)
    op.create_index("ix_ai_usage_events_operation_status", "ai_usage_events", ["operation", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_usage_events_operation_status", table_name="ai_usage_events")
    op.drop_index("ix_ai_usage_events_user_created_at", table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_model"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_provider"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_status"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_operation"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_refund_transaction_id"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_credit_transaction_id"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_ai_tool_job_id"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_job_id"), table_name="ai_usage_events")
    op.drop_index(op.f("ix_ai_usage_events_user_id"), table_name="ai_usage_events")
    op.drop_table("ai_usage_events")
