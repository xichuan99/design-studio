"""Central AI model registry.

Update model IDs in this module (or via env vars) instead of searching across
services. Every model constant can be overridden using its matching
`AI_MODEL_*` environment variable.
"""

import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


# Shared LLM model pairs (OpenRouter/xAI)
LLM_REASONING_PRIMARY = _env(
    "AI_MODEL_LLM_REASONING_PRIMARY",
    "openrouter/minimax/minimax-01",
)
LLM_REASONING_FALLBACK = _env(
    "AI_MODEL_LLM_REASONING_FALLBACK",
    "openrouter/qwen/qwen-2.5-72b-instruct",
)

LLM_VISION_PRIMARY = _env(
    "AI_MODEL_LLM_VISION_PRIMARY",
    "xai/grok-2-vision-1212",
)
LLM_VISION_FALLBACK = _env(
    "AI_MODEL_LLM_VISION_FALLBACK",
    "openrouter/qwen/qwen-vl-max",
)

LLM_BG_SUGGEST_PRIMARY = _env(
    "AI_MODEL_LLM_BG_SUGGEST_PRIMARY",
    "openrouter/qwen/qwen3.5-flash-02-23",
)
LLM_BG_SUGGEST_FALLBACK = _env(
    "AI_MODEL_LLM_BG_SUGGEST_FALLBACK",
    "minimax/minimax-m2.5",
)

LLM_BRAND_KIT_PRIMARY = _env(
    "AI_MODEL_LLM_BRAND_KIT_PRIMARY",
    "openrouter/minimax/minimax-m2.7",
)
LLM_BRAND_KIT_FALLBACK = _env(
    "AI_MODEL_LLM_BRAND_KIT_FALLBACK",
    "qwen/qwen-2.5-72b-instruct",
)


# Image generation and editing models
XAI_IMAGE_GENERATION = _env(
    "AI_MODEL_XAI_IMAGE_GENERATION",
    "grok-imagine-image",
)
GOOGLE_IMAGE_GENERATION = _env(
    "AI_MODEL_GOOGLE_IMAGE_GENERATION",
    "imagen-4.0-fast-generate-001",
)

FAL_IMAGE_TEXT_TO_IMAGE_PRIMARY = _env(
    "AI_MODEL_FAL_IMAGE_TEXT_TO_IMAGE_PRIMARY",
    "fal-ai/flux-pro/v1.1",
)
FAL_IMAGE_IMAGE_TO_IMAGE_PRIMARY = _env(
    "AI_MODEL_FAL_IMAGE_IMAGE_TO_IMAGE_PRIMARY",
    "fal-ai/flux/dev/image-to-image",
)
FAL_IMAGE_TEXT_TO_IMAGE_FALLBACK = _env(
    "AI_MODEL_FAL_IMAGE_TEXT_TO_IMAGE_FALLBACK",
    "fal-ai/flux/schnell",
)

FAL_REDESIGN_EDIT = _env(
    "AI_MODEL_FAL_REDESIGN_EDIT",
    "fal-ai/flux-2/flash/edit",
)

FAL_BANNER_DRAFT = _env(
    "AI_MODEL_FAL_BANNER_DRAFT",
    "fal-ai/flux/schnell",
)
FAL_BANNER_STANDARD = _env(
    "AI_MODEL_FAL_BANNER_STANDARD",
    "fal-ai/flux/dev",
)
FAL_BRAND_LOGO = _env(
    "AI_MODEL_FAL_BRAND_LOGO",
    "fal-ai/flux/dev",
)

FAL_BG_REMOVE_PRIMARY = _env(
    "AI_MODEL_FAL_BG_REMOVE_PRIMARY",
    "fal-ai/rmbg-v2",
)
FAL_BG_REMOVE_FALLBACK = _env(
    "AI_MODEL_FAL_BG_REMOVE_FALLBACK",
    "fal-ai/birefnet",
)
FAL_BG_INPAINT_FILL = _env(
    "AI_MODEL_FAL_BG_INPAINT_FILL",
    "fal-ai/flux-pro/v1/fill",
)
FAL_BG_SUGGEST_CAPTION = _env(
    "AI_MODEL_FAL_BG_SUGGEST_CAPTION",
    "fal-ai/florence-2-large/caption",
)

FAL_OUTPAINT = _env(
    "AI_MODEL_FAL_OUTPAINT",
    "fal-ai/image-apps-v2/outpaint",
)
FAL_UPSCALE = _env(
    "AI_MODEL_FAL_UPSCALE",
    "fal-ai/esrgan",
)
FAL_RETOUCH = _env(
    "AI_MODEL_FAL_RETOUCH",
    "fal-ai/codeformer",
)


# Embeddings
EMBEDDING_TEXT_MODEL = _env(
    "AI_MODEL_EMBEDDING_TEXT",
    "text-embedding-004",
)
