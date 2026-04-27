from app.core.exceptions import NotFoundError
from app.schemas.error import ERROR_RESPONSES
from typing import List, Optional
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_version import ProjectVersion
from app.schemas.project import ProjectResponse, ProjectUpdate
from app.schemas.project_version import ProjectVersionCreate, ProjectVersionResponse

router = APIRouter(tags=["Projects"])
logger = logging.getLogger(__name__)


@router.get(
    "/",
    response_model=List[ProjectResponse],
    status_code=status.HTTP_200_OK,
    summary="List Projects",
    description="List all saved projects for the currently authenticated user.",
    responses=ERROR_RESPONSES,
)
async def list_projects(
    folder_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """List all saved projects for the current user."""
    query = select(Project).where(Project.user_id == current_user.id)
    if folder_id:
        query = query.where(Project.folder_id == folder_id)

    result = await db.execute(
        query.order_by(desc(Project.updated_at))
    )
    return result.scalars().all()


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project",
    description="Save a new project with its initial canvas state.",
    responses=ERROR_RESPONSES,
)
async def create_project(
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a new project with its canvas state."""
    db_project = Project(
        user_id=current_user.id,
        title=project_in.title or "Untitled Design",
        status=project_in.status or "draft",
        canvas_state=project_in.canvas_state,
        canvas_schema_version=project_in.canvas_schema_version or 1,
        aspect_ratio=project_in.aspect_ratio or "1:1",
        folder_id=project_in.folder_id,
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Project",
    description="Retrieve details and canvas state of a specific project owned by the user.",
    responses=ERROR_RESPONSES,
)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise NotFoundError(detail="Project not found")

    return project


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Project",
    description="Update an existing project's canvas state, title, aspect ratio, or status.",
    responses=ERROR_RESPONSES,
)
async def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing project's canvas state, title, or status."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise NotFoundError(detail="Project not found")

    if project_in.title is not None:
        project.title = project_in.title
    if project_in.status is not None:
        project.status = project_in.status
    if project_in.canvas_state is not None:
        project.canvas_state = project_in.canvas_state
    if project_in.canvas_schema_version is not None:
        project.canvas_schema_version = project_in.canvas_schema_version
    if project_in.aspect_ratio is not None:
        project.aspect_ratio = project_in.aspect_ratio
    if hasattr(project_in, "folder_id") and project_in.folder_id is not None:
        project.folder_id = project_in.folder_id

    await db.commit()
    await db.refresh(project)
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project",
    description="Permanently delete a saved project and reclaim storage.",
    responses=ERROR_RESPONSES,
)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a saved project and reclaim associated storage."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise NotFoundError(detail="Project not found")

    # Find all jobs associated with this project and sum their file sizes
    from app.models.job import Job

    jobs_result = await db.execute(
        select(Job).where(Job.project_id == project_id)
    )
    jobs = jobs_result.scalars().all()

    total_file_size = sum(job.file_size or 0 for job in jobs)

    # Reclaim storage for all associated jobs
    if total_file_size > 0:
        from app.services.storage_quota_service import decrement_usage

        await decrement_usage(current_user.id, total_file_size, db)
        logger.info(
            f"Project {project_id}: reclaimed {total_file_size} bytes from user {current_user.id}"
        )

    # Delete associated job result files from storage
    from app.services.storage_service import delete_image

    for job in jobs:
        if job.result_url:
            try:
                await delete_image(job.result_url)
                logger.debug(f"Deleted job result file: {job.result_url}")
            except Exception as e:
                logger.warning(f"Failed to delete job result file {job.result_url}: {e}")

    # Delete the project (cascade will handle ProjectVersions)
    await db.delete(project)
    await db.commit()
    return None


@router.post(
    "/{project_id}/versions",
    response_model=ProjectVersionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project Version",
    description="Create a snapshot of the current project state.",
    responses=ERROR_RESPONSES,
)
async def create_project_version(
    project_id: UUID,
    version_in: ProjectVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a new version snapshot for a project."""
    # Verify project exists and belongs to user
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundError(detail="Project not found")

    # If canvas_state is not provided, use current project canvas_state
    canvas_state = version_in.canvas_state if version_in.canvas_state else project.canvas_state

    db_version = ProjectVersion(
        project_id=project_id,
        user_id=current_user.id,
        version_name=version_in.version_name or "Auto Save",
        canvas_state=canvas_state,
        canvas_schema_version=version_in.canvas_schema_version or project.canvas_schema_version,
    )
    db.add(db_version)
    await db.commit()
    await db.refresh(db_version)
    return db_version


@router.get(
    "/{project_id}/versions",
    response_model=List[ProjectVersionResponse],
    status_code=status.HTTP_200_OK,
    summary="List Project Versions",
    description="List all versions for a specific project.",
    responses=ERROR_RESPONSES,
)
async def list_project_versions(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all saved versions for a project."""
    # Verify project exists and belongs to user
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundError(detail="Project not found")

    versions_result = await db.execute(
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(desc(ProjectVersion.created_at))
    )
    return versions_result.scalars().all()


@router.delete(
    "/{project_id}/versions/{version_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project Version",
    description="Permanently delete a saved project version and reconcile storage.",
    responses=ERROR_RESPONSES,
)
async def delete_project_version(
    project_id: UUID,
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a saved project version and reconcile storage quota."""
    result = await db.execute(
        select(ProjectVersion).where(
            ProjectVersion.id == version_id,
            ProjectVersion.project_id == project_id,
            ProjectVersion.user_id == current_user.id
        )
    )
    version = result.scalar_one_or_none()

    if not version:
        raise NotFoundError(detail="Project version not found")

    # Delete the version
    await db.delete(version)
    await db.commit()

    # Reconcile storage after deleting version (in case any associated jobs were affected)
    from app.services.storage_quota_service import recalculate_storage

    try:
        new_storage = await recalculate_storage(current_user.id, db)
        logger.info(
            f"Version {version_id}: reconciled storage for user {current_user.id} to {new_storage} bytes"
        )
    except Exception as e:
        logger.warning(f"Failed to reconcile storage after version deletion: {e}")

    return None
