"""add_design_feedback

Revision ID: c4f2a1b7d9e0
Revises: a8f5d4c3b2a1
Create Date: 2026-05-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4f2a1b7d9e0"
down_revision: Union[str, None] = "a8f5d4c3b2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "design_feedback",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("design_id", sa.UUID(), nullable=True),
        sa.Column("job_id", sa.UUID(), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False, server_default="export"),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("helpful", sa.Boolean(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("export_format", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["design_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_design_feedback_user_id"), "design_feedback", ["user_id"], unique=False)
    op.create_index(op.f("ix_design_feedback_design_id"), "design_feedback", ["design_id"], unique=False)
    op.create_index(op.f("ix_design_feedback_job_id"), "design_feedback", ["job_id"], unique=False)
    op.create_index(op.f("ix_design_feedback_source"), "design_feedback", ["source"], unique=False)
    op.create_index("ix_design_feedback_user_created_at", "design_feedback", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_design_feedback_user_created_at", table_name="design_feedback")
    op.drop_index(op.f("ix_design_feedback_source"), table_name="design_feedback")
    op.drop_index(op.f("ix_design_feedback_job_id"), table_name="design_feedback")
    op.drop_index(op.f("ix_design_feedback_design_id"), table_name="design_feedback")
    op.drop_index(op.f("ix_design_feedback_user_id"), table_name="design_feedback")
    op.drop_table("design_feedback")
