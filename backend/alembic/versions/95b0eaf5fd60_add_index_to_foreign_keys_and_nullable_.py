"""Add index to foreign keys and nullable constraints

Revision ID: 95b0eaf5fd60
Revises: b8c1f2d3e4a5
Create Date: 2026-03-26 21:36:19.045677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95b0eaf5fd60'
down_revision: Union[str, None] = 'b8c1f2d3e4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.alter_column('users', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Projects
    op.create_index(op.f('ix_projects_user_id'), 'projects', ['user_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False, if_not_exists=True)
    op.alter_column('projects', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)
    op.alter_column('projects', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Jobs
    op.create_index(op.f('ix_jobs_project_id'), 'jobs', ['project_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_jobs_user_id'), 'jobs', ['user_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False, if_not_exists=True)
    op.alter_column('jobs', 'aspect_ratio', existing_type=sa.String(length=10), nullable=False)
    op.alter_column('jobs', 'style_preference', existing_type=sa.String(length=20), nullable=False)
    op.alter_column('jobs', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # AI Tool Jobs
    op.alter_column('ai_tool_jobs', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Brand Kits
    op.create_index(op.f('ix_brand_kits_user_id'), 'brand_kits', ['user_id'], unique=False, if_not_exists=True)
    op.alter_column('brand_kits', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Credit Transactions
    op.alter_column('credit_transactions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Design History
    op.create_index(op.f('ix_design_history_project_id'), 'design_history', ['project_id'], unique=False, if_not_exists=True)
    op.alter_column('design_history', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Template Favorites
    op.create_index(op.f('ix_template_favorites_user_id'), 'template_favorites', ['user_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_template_favorites_template_submission_id'), 'template_favorites', ['template_submission_id'], unique=False, if_not_exists=True)
    op.alter_column('template_favorites', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Template Reviews
    op.create_index(op.f('ix_template_reviews_template_submission_id'), 'template_reviews', ['template_submission_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_template_reviews_reviewer_user_id'), 'template_reviews', ['reviewer_user_id'], unique=False, if_not_exists=True)
    op.alter_column('template_reviews', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Template Submissions
    op.create_index(op.f('ix_template_submissions_owner_user_id'), 'template_submissions', ['owner_user_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_template_submissions_source_project_id'), 'template_submissions', ['source_project_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_template_submissions_category'), 'template_submissions', ['category'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_template_submissions_status'), 'template_submissions', ['status'], unique=False, if_not_exists=True)
    op.alter_column('template_submissions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)
    op.alter_column('template_submissions', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Template Usage Stats
    op.alter_column('template_usage_stats', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # Template Versions
    op.create_index(op.f('ix_template_versions_template_submission_id'), 'template_versions', ['template_submission_id'], unique=False, if_not_exists=True)
    op.alter_column('template_versions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)

    # AI Tool Results
    op.create_index(op.f('ix_ai_tool_results_user_id'), 'ai_tool_results', ['user_id'], unique=False, if_not_exists=True)
    op.alter_column('ai_tool_results', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=False)


def downgrade() -> None:
    # Users
    op.alter_column('users', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Projects
    op.drop_index(op.f('ix_projects_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_user_id'), table_name='projects')
    op.alter_column('projects', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=True)
    op.alter_column('projects', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Jobs
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_user_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_project_id'), table_name='jobs')
    op.alter_column('jobs', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)
    op.alter_column('jobs', 'style_preference', existing_type=sa.String(length=20), nullable=True)
    op.alter_column('jobs', 'aspect_ratio', existing_type=sa.String(length=10), nullable=True)

    # AI Tool Jobs
    op.alter_column('ai_tool_jobs', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Brand Kits
    op.drop_index(op.f('ix_brand_kits_user_id'), table_name='brand_kits')
    op.alter_column('brand_kits', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Credit Transactions
    op.alter_column('credit_transactions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Design History
    op.drop_index(op.f('ix_design_history_project_id'), table_name='design_history')
    op.alter_column('design_history', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Template Favorites
    op.drop_index(op.f('ix_template_favorites_template_submission_id'), table_name='template_favorites')
    op.drop_index(op.f('ix_template_favorites_user_id'), table_name='template_favorites')
    op.alter_column('template_favorites', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Template Reviews
    op.drop_index(op.f('ix_template_reviews_reviewer_user_id'), table_name='template_reviews')
    op.drop_index(op.f('ix_template_reviews_template_submission_id'), table_name='template_reviews')
    op.alter_column('template_reviews', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Template Submissions
    op.drop_index(op.f('ix_template_submissions_status'), table_name='template_submissions')
    op.drop_index(op.f('ix_template_submissions_category'), table_name='template_submissions')
    op.drop_index(op.f('ix_template_submissions_source_project_id'), table_name='template_submissions')
    op.drop_index(op.f('ix_template_submissions_owner_user_id'), table_name='template_submissions')
    op.alter_column('template_submissions', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=True)
    op.alter_column('template_submissions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Template Usage Stats
    op.alter_column('template_usage_stats', 'updated_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # Template Versions
    op.drop_index(op.f('ix_template_versions_template_submission_id'), table_name='template_versions')
    op.alter_column('template_versions', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)

    # AI Tool Results
    op.drop_index(op.f('ix_ai_tool_results_user_id'), table_name='ai_tool_results')
    op.alter_column('ai_tool_results', 'created_at', existing_type=sa.DateTime(timezone=True), nullable=True)
