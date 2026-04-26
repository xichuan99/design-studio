"""Add storage purchase and quota ledger tables

Revision ID: ab12cd34ef56
Revises: a1b2c3d4e5f6
Create Date: 2026-04-26 10:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "ab12cd34ef56"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "storage_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("addon_code", sa.String(), nullable=False),
        sa.Column("bytes_added", sa.BigInteger(), nullable=False),
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
    op.create_index(op.f("ix_storage_purchases_user_id"), "storage_purchases", ["user_id"], unique=False)
    op.create_index(op.f("ix_storage_purchases_addon_code"), "storage_purchases", ["addon_code"], unique=False)
    op.create_index(op.f("ix_storage_purchases_status"), "storage_purchases", ["status"], unique=False)

    op.create_table(
        "storage_quota_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purchase_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("delta_bytes", sa.BigInteger(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("source_ref", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["purchase_id"], ["storage_purchases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_storage_quota_ledger_user_id"), "storage_quota_ledger", ["user_id"], unique=False)
    op.create_index(op.f("ix_storage_quota_ledger_purchase_id"), "storage_quota_ledger", ["purchase_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_storage_quota_ledger_purchase_id"), table_name="storage_quota_ledger")
    op.drop_index(op.f("ix_storage_quota_ledger_user_id"), table_name="storage_quota_ledger")
    op.drop_table("storage_quota_ledger")

    op.drop_index(op.f("ix_storage_purchases_status"), table_name="storage_purchases")
    op.drop_index(op.f("ix_storage_purchases_addon_code"), table_name="storage_purchases")
    op.drop_index(op.f("ix_storage_purchases_user_id"), table_name="storage_purchases")
    op.drop_table("storage_purchases")
