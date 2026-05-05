"""add waitlist entries table

Revision ID: 6b31c6d9d001
Revises: e7f9a1c2d3b4
Create Date: 2026-05-06 09:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6b31c6d9d001"
down_revision: Union[str, None] = "e7f9a1c2d3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "waitlist_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("delivery_status", sa.String(), nullable=False),
        sa.Column("lead_magnet_delivered", sa.Boolean(), nullable=False),
        sa.Column("lead_magnet_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_error", sa.String(), nullable=True),
        sa.Column("converted_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_waitlist_entries_converted_user_id"), "waitlist_entries", ["converted_user_id"], unique=False)
    op.create_index(op.f("ix_waitlist_entries_email"), "waitlist_entries", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_waitlist_entries_email"), table_name="waitlist_entries")
    op.drop_index(op.f("ix_waitlist_entries_converted_user_id"), table_name="waitlist_entries")
    op.drop_table("waitlist_entries")
