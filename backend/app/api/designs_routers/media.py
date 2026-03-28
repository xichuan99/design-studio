from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES
from app.core.exceptions import InternalServerError

router = APIRouter(tags=["Designs - Media"])


@router.post(
    "/upload",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Upload User Image",
    description="Uploads a user image (for canvas or reference) and returns the public URL.",
    responses=ERROR_RESPONSES,
)
async def upload_user_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Uploads a user image (for canvas or reference) and returns the public URL."""
    from app.services.storage_service import upload_image_tracked

    content = await file.read()
    from app.services.file_validation import validate_uploaded_image
    mime_type = await validate_uploaded_image(content, max_size_mb=5, user_id=current_user.id, db=db)
    try:
        url = await upload_image_tracked(
            image_bytes=content,
            user_id=current_user.id,
            db=db,
            content_type=mime_type,
            prefix=f"uploads/{current_user.id}",
        )
        return {"url": url}
    except Exception as e:
        import logging

        logging.exception("Upload endpoint failed")
        raise InternalServerError(detail=f"Failed to upload image: {str(e)}")


@router.post(
    "/remove-background",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Remove Background API",
    description="Stand-alone endpoint to remove background from an uploaded image.",
    responses=ERROR_RESPONSES,
)
async def api_remove_background(
    file: UploadFile = File(...),
    current_user: User = Depends(rate_limit_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Stand-alone endpoint to remove background from an uploaded image.
    Returns the URL of the processed PNG transparent image.
    """
    content = await file.read()
    from app.services.file_validation import validate_uploaded_image
    await validate_uploaded_image(content, max_size_mb=10, user_id=current_user.id, db=db)

    from app.services.bg_removal_service import remove_background

    try:
        no_bg_bytes = await remove_background(content)

        # Upload the transparent PNG to our storage
        from app.services.storage_service import upload_image_tracked

        result_url = await upload_image_tracked(
            no_bg_bytes,
            user_id=current_user.id,
            db=db,
            content_type="image/png",
            prefix=f"nobg_{current_user.id}",
        )

        return {"url": result_url}
    except Exception as e:
        import logging

        logging.exception("Failed to remove background")
        raise InternalServerError(detail=f"Background removal failed: {str(e)}")
