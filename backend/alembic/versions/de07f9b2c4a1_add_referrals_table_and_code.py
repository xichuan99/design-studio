"""add referrals table and user referral code

Revision ID: de07f9b2c4a1
Revises: c90a8f2ab321
Create Date: 2026-05-06 17:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "de07f9b2c4a1"
down_revision: Union[str, None] = "c90a8f2ab321"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("referral_code", sa.String(), nullable=True))
    op.execute(
        """
        UPDATE users
        SET referral_code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12))
        WHERE referral_code IS NULL
        """
    )
    op.alter_column("users", "referral_code", nullable=False)
    op.create_index(op.f("ix_users_referral_code"), "users", ["referral_code"], unique=True)

    op.create_table(
        "referrals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("referrer_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("referred_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("reward_credits", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("credited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["referrer_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["referred_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("referred_user_id", name="uq_referrals_referred_user_id"),
        sa.UniqueConstraint("referrer_user_id", "referred_user_id", name="uq_referrals_pair"),
    )
    op.create_index(op.f("ix_referrals_referrer_user_id"), "referrals", ["referrer_user_id"], unique=False)
    op.create_index(op.f("ix_referrals_referred_user_id"), "referrals", ["referred_user_id"], unique=False)
    op.create_index(op.f("ix_referrals_status"), "referrals", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_referrals_status"), table_name="referrals")
    op.drop_index(op.f("ix_referrals_referred_user_id"), table_name="referrals")
    op.drop_index(op.f("ix_referrals_referrer_user_id"), table_name="referrals")
    op.drop_table("referrals")

    op.drop_index(op.f("ix_users_referral_code"), table_name="users")
    op.drop_column("users", "referral_code")
