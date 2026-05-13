"""Add analytics_events table for backend-owned funnel metrics.

Revision ID: b1c2d3e4f5a6
Revises: a8b7c6d5e4f3
Create Date: 2026-05-13 16:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b1c2d3e4f5a6"
down_revision = "a8b7c6d5e4f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "analytics_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("visitor_id", sa.String(length=255), nullable=False),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("variant", sa.String(length=64), nullable=True),
        sa.Column("auth_method", sa.String(length=32), nullable=True),
        sa.Column("event_properties", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"], unique=False)
    op.create_index("ix_analytics_events_event_name", "analytics_events", ["event_name"], unique=False)
    op.create_index("ix_analytics_events_visitor_id", "analytics_events", ["visitor_id"], unique=False)
    op.create_index("ix_analytics_events_source", "analytics_events", ["source"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_analytics_events_source", table_name="analytics_events")
    op.drop_index("ix_analytics_events_visitor_id", table_name="analytics_events")
    op.drop_index("ix_analytics_events_event_name", table_name="analytics_events")
    op.drop_index("ix_analytics_events_created_at", table_name="analytics_events")
    op.drop_table("analytics_events")
