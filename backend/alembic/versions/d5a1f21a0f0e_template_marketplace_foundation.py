"""template_marketplace_foundation

Revision ID: d5a1f21a0f0e
Revises: c3d4e5f60718
Create Date: 2026-03-23 14:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5a1f21a0f0e"
down_revision: Union[str, None] = "c3d4e5f60718"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "template_submissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("owner_user_id", sa.UUID(), nullable=False),
        sa.Column("source_project_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("aspect_ratio", sa.String(), nullable=False, server_default="1:1"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("preview_canvas_state", sa.JSON(), nullable=False),
        sa.Column("default_text_layers", sa.JSON(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("prompt_suffix", sa.String(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_template_submissions_status_category",
        "template_submissions",
        ["status", "category"],
        unique=False,
    )
    op.create_index(
        "ix_template_submissions_owner_user_id",
        "template_submissions",
        ["owner_user_id"],
        unique=False,
    )

    op.create_table(
        "template_reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("template_submission_id", sa.UUID(), nullable=False),
        sa.Column("reviewer_user_id", sa.UUID(), nullable=True),
        sa.Column("decision", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["template_submission_id"], ["template_submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "template_versions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("template_submission_id", sa.UUID(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("canvas_state", sa.JSON(), nullable=False),
        sa.Column("default_text_layers", sa.JSON(), nullable=False),
        sa.Column("thumbnail_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["template_submission_id"], ["template_submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_submission_id", "version_number", name="uq_template_submission_version"),
    )

    op.create_table(
        "template_favorites",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("template_submission_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["template_submission_id"], ["template_submissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "template_submission_id", name="uq_template_favorite_user_submission"),
    )

    op.create_table(
        "template_usage_stats",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("template_submission_id", sa.UUID(), nullable=False),
        sa.Column("uses_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("favorite_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["template_submission_id"], ["template_submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_submission_id"),
    )


def downgrade() -> None:
    op.drop_table("template_usage_stats")
    op.drop_table("template_favorites")
    op.drop_table("template_versions")
    op.drop_table("template_reviews")
    op.drop_index("ix_template_submissions_owner_user_id", table_name="template_submissions")
    op.drop_index("ix_template_submissions_status_category", table_name="template_submissions")
    op.drop_table("template_submissions")
