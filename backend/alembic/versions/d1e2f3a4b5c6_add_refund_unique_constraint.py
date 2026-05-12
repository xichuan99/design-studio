"""add_refund_unique_constraint

Revision ID: d1e2f3a4b5c6
Revises: c4f2a1b7d9e0
Create Date: 2026-05-12

Add a partial UNIQUE index on ai_usage_events.refund_transaction_id WHERE NOT NULL.
This enforces idempotency at the DB level: the same refund_transaction_id cannot be
written twice, preventing concurrent double-refund even if the application-layer
is_usage_refunded() guard is bypassed under race conditions.
"""

from alembic import op

revision = "d1e2f3a4b5c6"
down_revision = "c4f2a1b7d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_ai_usage_events_refund_transaction_id",
        "ai_usage_events",
        ["refund_transaction_id"],
        unique=True,
        postgresql_where="refund_transaction_id IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_index(
        "uq_ai_usage_events_refund_transaction_id",
        table_name="ai_usage_events",
    )
