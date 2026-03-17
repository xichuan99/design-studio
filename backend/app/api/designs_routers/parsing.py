from fastapi import APIRouter, status
from app.schemas.design import (
    DesignGenerationRequest,
    ParsedTextElements,
    ModifyPromptRequest,
    ModifyPromptResponse,
)

from app.services.llm_service import parse_design_text
from app.schemas.error import ERROR_RESPONSES
from app.core.exceptions import InternalServerError

router = APIRouter(tags=["Designs - Parsing"])


@router.post(
    "/parse",
    response_model=ParsedTextElements,
    status_code=status.HTTP_200_OK,
    summary="Parse Design Text",
    description="Preview functionality: parse text into structured elements without generating the image.",
    responses=ERROR_RESPONSES,
)
async def parse_text(request: DesignGenerationRequest) -> ParsedTextElements:
    """Preview functionality: parse text into structured elements without generating the image."""
    try:
        # Use simple caching (or direct pass-through) to not over-query the LLM
        # For this prototype we'll just call the LLM directly
        parsed = await parse_design_text(
            raw_text=request.raw_text,
            integrated_text=request.integrated_text,
            clarification_answers=request.clarification_answers,
        )
        return parsed
    except Exception as e:
        raise InternalServerError(detail=f"Failed to parse text: {str(e)}")


@router.post(
    "/modify-prompt",
    response_model=ModifyPromptResponse,
    status_code=status.HTTP_200_OK,
    summary="Modify Visual Prompt",
    description="Modifies visual prompt parts via Gemini based on Indonesian text instructions.",
    responses=ERROR_RESPONSES,
)
async def modify_prompt(request: ModifyPromptRequest) -> ModifyPromptResponse:
    """Modifies visual prompt parts via Gemini based on Indonesian text instructions."""
    from app.services.llm_service import modify_visual_prompt

    try:
        result = await modify_visual_prompt(
            original_parts=request.original_prompt_parts,
            original_visual_prompt=request.original_visual_prompt,
            instruction=request.user_instruction,
        )
        # Assuming the result is a dict that matches ModifyPromptResponse structure
        return ModifyPromptResponse(**result)
    except Exception as e:
        import logging

        logging.exception("Failed to modify prompt")
        raise InternalServerError(detail=f"Failed to modify prompt: {str(e)}")
