"""harden_job_foreign_keys

Revision ID: 9b2f7c1d4e8a
Revises: 4a69752dc731
Create Date: 2026-03-23 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9b2f7c1d4e8a"
down_revision: Union[str, None] = "4a69752dc731"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("jobs_user_id_fkey", "jobs", type_="foreignkey")
    op.drop_constraint("jobs_project_id_fkey", "jobs", type_="foreignkey")

    op.create_foreign_key(
        "fk_jobs_user_id_users",
        "jobs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_jobs_project_id_projects",
        "jobs",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_jobs_user_id_users", "jobs", type_="foreignkey")
    op.drop_constraint("fk_jobs_project_id_projects", "jobs", type_="foreignkey")

    op.create_foreign_key(
        "jobs_user_id_fkey",
        "jobs",
        "users",
        ["user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "jobs_project_id_fkey",
        "jobs",
        "projects",
        ["project_id"],
        ["id"],
    )
