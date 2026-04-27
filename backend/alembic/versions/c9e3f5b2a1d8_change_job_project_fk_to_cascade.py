"""Change Job.project_id foreign key to CASCADE delete

Revision ID: c9e3f5b2a1d8
Revises: 9b2f7c1d4e8a
Create Date: 2026-04-27 10:30:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c9e3f5b2a1d8"
down_revision: Union[str, None] = "9b2f7c1d4e8a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change Job.project_id FK from SET NULL to CASCADE.

    After this migration, deleting a project will automatically delete
    all associated jobs. This prevents orphaned jobs from accumulating.

    Existing orphaned jobs (with project_id=NULL) are unaffected.
    """
    # Drop the existing foreign key constraint
    op.drop_constraint("fk_jobs_project_id_projects", "jobs", type_="foreignkey")

    # Create new foreign key with CASCADE delete
    op.create_foreign_key(
        "fk_jobs_project_id_projects_cascade",
        "jobs",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Revert to SET NULL behavior."""
    op.drop_constraint("fk_jobs_project_id_projects_cascade", "jobs", type_="foreignkey")

    # Restore original SET NULL behavior
    op.create_foreign_key(
        "fk_jobs_project_id_projects",
        "jobs",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )
