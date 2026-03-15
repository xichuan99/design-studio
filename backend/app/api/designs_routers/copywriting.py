from fastapi import APIRouter, Depends, HTTPException, status
from app.core.exceptions import InternalServerError
from app.schemas.design import (
    CopywritingClarifyRequest,
    CopywritingRequest,
    CopywritingResponse,
)
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User
from app.schemas.error import ERROR_RESPONSES

router = APIRouter(tags=["Designs - Copywriting"])

@router.post(
    "/clarify-copywriting",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Clarify Copywriting",
    description="Generates 3-4 clarification questions for copywriting.",
    responses=ERROR_RESPONSES,
)
async def clarify_copywriting(
    request: CopywritingClarifyRequest,
    current_user: User = Depends(rate_limit_dependency),
) -> dict:
    """Generates 3-4 clarification questions for copywriting."""
    from app.services.llm_service import generate_copywriting_questions

    try:
        result = await generate_copywriting_questions(request.product_description)
        return result
    except Exception:
        import logging

        logging.exception("Failed to clarify copywriting")
        raise InternalServerError(detail="Failed to clarify copywriting")

@router.post(
    "/generate-copywriting",
    response_model=CopywritingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Copywriting",
    description="Generates 3 variations of copywriting based on product description and clarifications.",
    responses=ERROR_RESPONSES,
)
async def generate_copywriting(
    request: CopywritingRequest,
    current_user: User = Depends(rate_limit_dependency),
):
    """Generates 3 variations of copywriting based on product description and clarifications."""
    from app.services.llm_service import generate_ai_copywriting

    try:
        result = await generate_ai_copywriting(
            product_description=request.product_description,
            tone=request.tone,
            brand_name=request.brand_name,
            clarification_answers=request.clarification_answers,
        )
        return result
    except Exception:
        import logging

        logging.exception("Failed to generate copywriting")
        raise InternalServerError(detail="Failed to generate copywriting")
