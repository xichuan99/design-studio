from __future__ import annotations

from app.schemas.design import StylePreference

_STYLE_MAP: dict[str, str] = {
    StylePreference.BOLD.value: "product_hero",
    StylePreference.MINIMALIST.value: "infographic",
    StylePreference.ELEGANT.value: "cinematic",
    StylePreference.PLAYFUL.value: "comic",
    "auto": "auto",
    "macro": "macro",
    "cinematic": "cinematic",
    "comic": "comic",
    "infographic": "infographic",
    "isometric_3d": "isometric_3d",
    "product_hero": "product_hero",
    "blueprint": "blueprint",
}


def resolve_style_preset(
    style_preference: str | None,
    *,
    mode: str | None = None,
    goal: str | None = None,
) -> str:
    style_key = (style_preference or "auto").strip().lower()
    if style_key in _STYLE_MAP:
        return _STYLE_MAP[style_key]

    context = " ".join(filter(None, [mode, goal])).lower()
    if any(term in context for term in ["blueprint", "wireframe", "teknis", "technical"]):
        return "blueprint"
    if any(term in context for term in ["komik", "comic", "playful", "ceria"]):
        return "comic"
    if any(term in context for term in ["minimal", "clean", "flat", "infografis", "infographic"]):
        return "infographic"
    if any(term in context for term in ["elegan", "premium", "cinematic", "dramatic"]):
        return "cinematic"
    if any(term in context for term in ["produk", "product", "hero", "iklan"]):
        return "product_hero"
    return "auto"
