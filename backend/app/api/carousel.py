import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.carousel import (
    CarouselExportRequest,
    CarouselGenerateRequest,
    CarouselGenerateResponse,
    CarouselRegenerateSlideRequest,
    CarouselRegenerateSlideResponse,
)
from app.services.carousel_export_service import export_carousel_zip
from app.services.carousel_generation_service import generate_carousel, regenerate_carousel_slide

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=CarouselGenerateResponse)
async def generate_carousel_route(
    request: CarouselGenerateRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> CarouselGenerateResponse:
    logger.info("Generating carousel for user %s on topic '%s'", current_user.id, request.topic)
    return await generate_carousel(request)


@router.post("/regenerate-slide", response_model=CarouselRegenerateSlideResponse)
async def regenerate_carousel_slide_route(
    request: CarouselRegenerateSlideRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> CarouselRegenerateSlideResponse:
    logger.info(
        "Regenerating carousel slide %s for user %s",
        request.slide_index,
        current_user.id,
    )
    slide = await regenerate_carousel_slide(request)
    return CarouselRegenerateSlideResponse(slide=slide)


@router.post("/export")
async def export_carousel_route(
    request: CarouselExportRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> StreamingResponse:
    logger.info("Exporting carousel %s for user %s", request.carousel_id, current_user.id)
    archive_bytes = export_carousel_zip(request)
    filename = f"{request.carousel_id}.zip"
    return StreamingResponse(
        iter([archive_bytes]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
