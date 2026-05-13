"""Add credit purchase table and ledger fulfillment support

Revision ID: e7f3a1c2b4d5
Revises: d1e2f3a4b5c6
Create Date: 2026-05-13 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e7f3a1c2b4d5"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "credit_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pack_code", sa.String(), nullable=False),
        sa.Column("credits_added", sa.BigInteger(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="IDR"),
        sa.Column("provider", sa.String(), nullable=False, server_default="manual"),
        sa.Column("provider_txn_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("paid_event_id", sa.String(), nullable=True),
        sa.Column("checkout_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_txn_id"),
        sa.UniqueConstraint("paid_event_id"),
    )
    op.create_index(op.f("ix_credit_purchases_user_id"), "credit_purchases", ["user_id"], unique=False)
    op.create_index(op.f("ix_credit_purchases_pack_code"), "credit_purchases", ["pack_code"], unique=False)
    op.create_index(op.f("ix_credit_purchases_status"), "credit_purchases", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_credit_purchases_status"), table_name="credit_purchases")
    op.drop_index(op.f("ix_credit_purchases_pack_code"), table_name="credit_purchases")
    op.drop_index(op.f("ix_credit_purchases_user_id"), table_name="credit_purchases")
    op.drop_table("credit_purchases")
