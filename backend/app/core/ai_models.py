"""Central AI model registry.

Update model IDs in this module (or via env vars) instead of searching across
services. Every model constant can be overridden using its matching
`AI_MODEL_*` environment variable.
"""

import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


# ═══════════════════════════════════════════════════════════════
# VISION — Analisis Gambar, Logo, Screenshot Website
# ═══════════════════════════════════════════════════════════════
LLM_VISION_PRIMARY = _env(
    "AI_MODEL_LLM_VISION_PRIMARY",
    "openrouter/qwen/qwen3.5-flash-02-23",
)
LLM_VISION_FALLBACK = _env(
    "AI_MODEL_LLM_VISION_FALLBACK",
    "openrouter/bytedance-seed/seed-2.0-mini",
)

# ═══════════════════════════════════════════════════════════════
# BACKGROUND SUGGEST — Color Palette, Latar Rekomendasi
# ═══════════════════════════════════════════════════════════════
LLM_BG_SUGGEST_PRIMARY = _env(
    "AI_MODEL_LLM_BG_SUGGEST_PRIMARY",
    "openrouter/qwen/qwen3.5-flash-02-23",
)

# ═══════════════════════════════════════════════════════════════
# BRAND KIT — Ekstraksi dari URL, File, Brief (butuh vision + long context)
# ═══════════════════════════════════════════════════════════════
LLM_BRAND_KIT_PRIMARY = _env(
    "AI_MODEL_LLM_BRAND_KIT_PRIMARY",
    "openrouter/qwen/qwen3.5-flash-02-23",
)
LLM_BRAND_KIT_FALLBACK = _env(
    "AI_MODEL_LLM_BRAND_KIT_FALLBACK",
    "openrouter/bytedance-seed/seed-1.6",
)

# ═══════════════════════════════════════════════════════════════
# REASONING — Design Brief Interview, Complex Copywriting
# ═══════════════════════════════════════════════════════════════
LLM_REASONING_PRIMARY = _env(
    "AI_MODEL_LLM_REASONING_PRIMARY",
    "openrouter/qwen/qwq-32b",
)
LLM_REASONING_FALLBACK = _env(
    "AI_MODEL_LLM_REASONING_FALLBACK",
    "openrouter/deepseek/deepseek-r1",
)


# Image generation and editing models
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
    "openrouter/nomic-ai/nomic-embed-text-v1.5",
)
