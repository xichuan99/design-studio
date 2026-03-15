from fastapi import APIRouter, Depends, HTTPException
from app.schemas.design import (
    CopywritingClarifyRequest,
    CopywritingRequest,
    CopywritingResponse,
)
from app.api.rate_limit import rate_limit_dependency
from app.models.user import User

router = APIRouter()


@router.post("/clarify-copywriting")
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
        raise HTTPException(status_code=500, detail="Failed to clarify copywriting")

@router.post("/generate-copywriting", response_model=CopywritingResponse)
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
        raise HTTPException(status_code=500, detail="Failed to generate copywriting")

