import logging

from fastapi import APIRouter, Depends

from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.catalog import (
    CatalogBasicsRequest,
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

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/plan-structure", response_model=PlanStructureResponse)
async def plan_catalog_structure_route(
    request: CatalogBasicsRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> PlanStructureResponse:
    logger.info("Planning catalog structure for user %s (%s)", current_user.id, request.catalog_type)
    return await plan_catalog_structure(request)


@router.post("/suggest-styles", response_model=SuggestStylesResponse)
async def suggest_catalog_styles_route(
    request: SuggestStylesRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> SuggestStylesResponse:
    logger.info("Suggesting catalog styles for user %s", current_user.id)
    return await suggest_catalog_styles(request)


@router.post("/map-images", response_model=ImageMappingResponse)
async def map_catalog_images_route(
    request: ImageMappingRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> ImageMappingResponse:
    logger.info("Mapping catalog images for user %s (%s images)", current_user.id, len(request.images))
    return await map_catalog_images(request)


@router.post("/generate-copy", response_model=GenerateCopyResponse)
async def generate_catalog_copy_route(
    request: GenerateCopyRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> GenerateCopyResponse:
    logger.info("Generating catalog copy for user %s", current_user.id)
    return await generate_catalog_copy(request)


@router.post("/finalize-plan", response_model=FinalizePlanResponse)
async def finalize_catalog_plan_route(
    request: FinalizePlanRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> FinalizePlanResponse:
    logger.info("Finalizing catalog plan for user %s", current_user.id)
    return await finalize_catalog_plan(request)
