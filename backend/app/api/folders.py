from app.core.exceptions import NotFoundError
from app.schemas.error import ERROR_RESPONSES
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.folder import Folder
from app.schemas.folder import FolderResponse, FolderCreate, FolderUpdate

router = APIRouter(tags=["Folders"])


@router.get(
    "/",
    response_model=List[FolderResponse],
    status_code=status.HTTP_200_OK,
    summary="List Folders",
    description="List all folders for the currently authenticated user.",
    responses=ERROR_RESPONSES,
)
async def list_folders(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """List all folders for the current user."""
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(desc(Folder.updated_at))
    )
    return result.scalars().all()


@router.post(
    "/",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Folder",
    description="Create a new folder.",
    responses=ERROR_RESPONSES,
)
async def create_folder(
    folder_in: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new folder."""
    db_folder = Folder(
        user_id=current_user.id,
        name=folder_in.name,
        parent_id=folder_in.parent_id,
    )
    db.add(db_folder)
    await db.commit()
    await db.refresh(db_folder)
    return db_folder


@router.get(
    "/{folder_id}",
    response_model=FolderResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Folder",
    description="Retrieve details of a specific folder owned by the user.",
    responses=ERROR_RESPONSES,
)
async def get_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific folder."""
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.user_id == current_user.id
        )
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise NotFoundError(detail="Folder not found")

    return folder


@router.put(
    "/{folder_id}",
    response_model=FolderResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Folder",
    description="Update an existing folder's name or parent.",
    responses=ERROR_RESPONSES,
)
async def update_folder(
    folder_id: UUID,
    folder_in: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing folder."""
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.user_id == current_user.id
        )
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise NotFoundError(detail="Folder not found")

    if folder_in.name is not None:
        folder.name = folder_in.name
    if folder_in.parent_id is not None:
        folder.parent_id = folder_in.parent_id

    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Folder",
    description="Permanently delete a folder. (Does not delete projects inside it because relation is SET NULL).",
    responses=ERROR_RESPONSES,
)
async def delete_folder(
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a folder."""
    result = await db.execute(
        select(Folder).where(
            Folder.id == folder_id, Folder.user_id == current_user.id
        )
    )
    folder = result.scalar_one_or_none()

    if not folder:
        raise NotFoundError(detail="Folder not found")

    await db.delete(folder)
    await db.commit()
    return None
