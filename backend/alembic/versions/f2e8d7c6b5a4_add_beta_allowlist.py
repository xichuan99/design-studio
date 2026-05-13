"""Add beta allowlist table and invite_source to users.

Revision ID: f2e8d7c6b5a4
Revises: e7f3a1c2b4d5
Create Date: 2026-05-13 15:30:00+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f2e8d7c6b5a4'
down_revision = 'e7f3a1c2b4d5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add invite_source column to users table
    op.add_column('users', sa.Column('invite_source', sa.String(), nullable=True))
    op.create_index('ix_users_invite_source', 'users', ['invite_source'])

    # Create beta_allowlist table
    op.create_table(
        'beta_allowlist',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('entry_type', sa.String(length=16), nullable=False),
        sa.Column('entry_value', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('beta_cohort', sa.String(length=50), nullable=True),
        sa.Column('initial_credits_grant', sa.Integer(), nullable=False),
        sa.Column('used_count', sa.Integer(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_beta_allowlist_entry_type', 'beta_allowlist', ['entry_type'])
    op.create_index('ix_beta_allowlist_entry_value', 'beta_allowlist', ['entry_value'])
    op.create_index('ix_beta_allowlist_status', 'beta_allowlist', ['status'])
    op.create_index('ix_beta_allowlist_beta_cohort', 'beta_allowlist', ['beta_cohort'])
    op.create_index(
        'ix_beta_allowlist_lookup',
        'beta_allowlist',
        ['entry_type', 'entry_value', 'status'],
    )


def downgrade() -> None:
    # Drop beta_allowlist table
    op.drop_index('ix_beta_allowlist_lookup', table_name='beta_allowlist')
    op.drop_index('ix_beta_allowlist_beta_cohort', table_name='beta_allowlist')
    op.drop_index('ix_beta_allowlist_status', table_name='beta_allowlist')
    op.drop_index('ix_beta_allowlist_entry_value', table_name='beta_allowlist')
    op.drop_index('ix_beta_allowlist_entry_type', table_name='beta_allowlist')
    op.drop_table('beta_allowlist')

    # Remove invite_source from users
    op.drop_index('ix_users_invite_source', table_name='users')
    op.drop_column('users', 'invite_source')
