import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_actions, rate_limit_reads
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.catalog import (
    CatalogBasicsRequest,
    CatalogRenderStartRequest,
    CatalogRenderStartResponse,
    CatalogRenderStatusResponse,
    FinalizePlanRequest,
    FinalizePlanResponse,
    GenerateCopyRequest,
    GenerateCopyResponse,
    ImageMappingRequest,
    ImageMappingResponse,
    PlanStructureResponse,
    SuggestStylesRequest,
    SuggestStylesResponse,
)
from app.services.catalog_generation_service import (
    finalize_catalog_plan,
    generate_catalog_copy,
    map_catalog_images,
    plan_catalog_structure,
    suggest_catalog_styles,
)
from app.services.catalog_render_service import (
    get_catalog_render_job_for_user,
    serialize_catalog_render_status,
    start_catalog_render_job,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/plan-structure", response_model=PlanStructureResponse)
async def plan_catalog_structure_route(
    request: CatalogBasicsRequest,
    current_user: User = Depends(rate_limit_actions),
) -> PlanStructureResponse:
    logger.info("Planning catalog structure for user %s (%s)", current_user.id, request.catalog_type)
    return await plan_catalog_structure(request)


@router.post("/suggest-styles", response_model=SuggestStylesResponse)
async def suggest_catalog_styles_route(
    request: SuggestStylesRequest,
    current_user: User = Depends(rate_limit_actions),
) -> SuggestStylesResponse:
    logger.info("Suggesting catalog styles for user %s", current_user.id)
    return await suggest_catalog_styles(request)


@router.post("/map-images", response_model=ImageMappingResponse)
async def map_catalog_images_route(
    request: ImageMappingRequest,
    current_user: User = Depends(rate_limit_actions),
) -> ImageMappingResponse:
    logger.info("Mapping catalog images for user %s (%s images)", current_user.id, len(request.images))
    return await map_catalog_images(request)


@router.post("/generate-copy", response_model=GenerateCopyResponse)
async def generate_catalog_copy_route(
    request: GenerateCopyRequest,
    current_user: User = Depends(rate_limit_actions),
) -> GenerateCopyResponse:
    logger.info("Generating catalog copy for user %s", current_user.id)
    return await generate_catalog_copy(request)


@router.post("/finalize-plan", response_model=FinalizePlanResponse)
async def finalize_catalog_plan_route(
    request: FinalizePlanRequest,
    current_user: User = Depends(rate_limit_actions),
) -> FinalizePlanResponse:
    logger.info("Finalizing catalog plan for user %s", current_user.id)
    return await finalize_catalog_plan(request)


@router.post("/render", response_model=CatalogRenderStartResponse)
async def start_catalog_render_route(
    request: CatalogRenderStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_actions),
) -> CatalogRenderStartResponse:
    logger.info(
        "Starting catalog render job for user %s (%s pages)",
        current_user.id,
        request.final_plan.total_pages,
    )
    payload = await start_catalog_render_job(db=db, current_user=current_user, request=request)
    return CatalogRenderStartResponse(**payload)


@router.get("/render/{job_id}", response_model=CatalogRenderStatusResponse)
async def get_catalog_render_status_route(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(rate_limit_reads),
) -> CatalogRenderStatusResponse:
    job = await get_catalog_render_job_for_user(
        db=db,
        job_id=job_id,
        user_id=current_user.id,
    )
    if not job or job.tool_name != "catalog_render":
        raise NotFoundError(detail="Catalog render job not found")

    payload = serialize_catalog_render_status(job)
    return CatalogRenderStatusResponse(**payload)
