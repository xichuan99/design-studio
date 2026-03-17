"""Service for LLM interactions (Gemini API) for text parsing, generation, and design clarification.
This acts as a re-export facade for backward compatibility.
"""

from app.services.llm_prompts import (
    SYSTEM_PROMPT,
    BRIEF_QUESTIONS_SYSTEM,
    COPYWRITING_BRIEF_SYSTEM,
    COPYWRITING_SYSTEM_PROMPT,
    UNIFIED_BRIEF_SYSTEM,
    MODIFY_PROMPT_SYSTEM,
    MAGIC_TEXT_SYSTEM,
)

from app.services.llm_design_service import (
    generate_design_brief_questions,
    generate_unified_brief_questions,
    parse_design_text,
    modify_visual_prompt,
    generate_project_title,
)

from app.services.llm_copywriting_service import (
    generate_copywriting_questions,
    generate_ai_copywriting,
)

from app.services.llm_magic_text_service import (
    generate_magic_text_layout,
)

__all__ = [
    "SYSTEM_PROMPT",
    "BRIEF_QUESTIONS_SYSTEM",
    "COPYWRITING_BRIEF_SYSTEM",
    "COPYWRITING_SYSTEM_PROMPT",
    "UNIFIED_BRIEF_SYSTEM",
    "MODIFY_PROMPT_SYSTEM",
    "MAGIC_TEXT_SYSTEM",
    "generate_design_brief_questions",
    "generate_unified_brief_questions",
    "parse_design_text",
    "modify_visual_prompt",
    "generate_project_title",
    "generate_copywriting_questions",
    "generate_ai_copywriting",
    "generate_magic_text_layout",
]
