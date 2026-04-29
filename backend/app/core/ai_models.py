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
    "openrouter/google/gemma-4-31b-it",
)
LLM_VISION_FALLBACK = _env(
    "AI_MODEL_LLM_VISION_FALLBACK",
    "google/gemini-2.5-flash",
)

# ═══════════════════════════════════════════════════════════════
# BACKGROUND SUGGEST — Color Palette, Latar Rekomendasi
# ═══════════════════════════════════════════════════════════════
LLM_BG_SUGGEST_PRIMARY = _env(
    "AI_MODEL_LLM_BG_SUGGEST_PRIMARY",
    "openrouter/deepseek/deepseek-v4-flash",
)

# ═══════════════════════════════════════════════════════════════
# BRAND KIT — Ekstraksi dari URL, File, Brief (butuh vision + long context)
# ═══════════════════════════════════════════════════════════════
LLM_BRAND_KIT_PRIMARY = _env(
    "AI_MODEL_LLM_BRAND_KIT_PRIMARY",
    "openrouter/deepseek/deepseek-v4-flash",
)
LLM_BRAND_KIT_FALLBACK = _env(
    "AI_MODEL_LLM_BRAND_KIT_FALLBACK",
    "openrouter/qwen/qwen3.6-flash",
)

# ═══════════════════════════════════════════════════════════════
# REASONING — Design Brief Interview, Complex Copywriting
# ═══════════════════════════════════════════════════════════════
LLM_REASONING_PRIMARY = _env(
    "AI_MODEL_LLM_REASONING_PRIMARY",
    "openrouter/deepseek/deepseek-v4-flash",
)
LLM_REASONING_FALLBACK = _env(
    "AI_MODEL_LLM_REASONING_FALLBACK",
    "openrouter/qwen/qwen3.6-flash",
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
FAL_RETOUCH_RELIGHT_PRIMARY = _env(
    "AI_MODEL_FAL_RETOUCH_RELIGHT_PRIMARY",
    "bria/fibo-edit/relight",
)
FAL_RETOUCH_RELIGHT_FALLBACK = _env(
    "AI_MODEL_FAL_RETOUCH_RELIGHT_FALLBACK",
    "fal-ai/image-apps-v2/relighting",
)

# ═══════════════════════════════════════════════════════════════
# ULTRA QUALITY — gpt-image-2 via fal.ai (no OpenAI key needed)
# ═══════════════════════════════════════════════════════════════
FAL_IMAGE_GPT2_TEXT_TO_IMAGE = _env(
    "AI_MODEL_FAL_GPT2_TEXT_TO_IMAGE",
    "fal-ai/gpt-image-2",
)
FAL_IMAGE_GPT2_IMAGE_TO_IMAGE = _env(
    "AI_MODEL_FAL_GPT2_IMAGE_TO_IMAGE",
    "openai/gpt-image-2/edit",
)

# Default standard provider for Magic Eraser
FAL_IMAGE_BRIA_FIBO_EDIT = _env(
    "AI_MODEL_FAL_BRIA_FIBO_EDIT",
    "bria/fibo-edit/edit",
)


# Embeddings
EMBEDDING_TEXT_MODEL = _env(
    "AI_MODEL_EMBEDDING_TEXT",
    "openrouter/nomic-ai/nomic-embed-text-v1.5",
)
