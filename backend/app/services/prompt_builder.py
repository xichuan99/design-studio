"""
Modular Prompt Builder for AI image generation.

Replaces flat string concatenation with a structured, layered approach
inspired by industry-standard prompt engineering techniques (Ultimate-Nano-Banana-Pro-Collection).

Each StylePreset captures: environment, lighting, camera, material, action_physics,
hard_constraints, negative_prompt, and rendering_hint — assembled into a single
optimized prompt string by PromptBuilder.
"""

from __future__ import annotations
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

from app.services.style_mapping import resolve_style_preset


@dataclass
class StylePreset:
    """Encapsulates all prompt engineering parameters for a visual style."""
    key: str
    label: str
    environment: str
    lighting: str
    camera: str
    material: str
    action_physics: str
    quality_rules: str
    rendering_hint: str
    hard_constraints: list = field(default_factory=list)
    negative_prompt: list = field(default_factory=list)


STYLE_PRESETS: dict = {
    "auto": StylePreset(
        key="auto",
        label="✨ Auto",
        environment="clean studio backdrop, neutral gradient, copy-space area",
        lighting="three-point studio lighting: soft key light, fill light, and subtle rim light",
        camera="50mm standard lens, f/5.6, moderate depth of field",
        material="clean surface finish, subtle specular highlights",
        action_physics="",
        quality_rules="8k resolution, photorealistic, sharp focus, no artifacts",
        rendering_hint="",
        hard_constraints=[
            "no text or letters in background",
            "no watermarks or logos",
            "no busy or distracting patterns",
        ],
        negative_prompt=[
            "blurry", "low quality", "deformed", "ugly", "bad anatomy",
            "text", "watermark", "signature", "oversaturated",
        ],
    ),
    "macro": StylePreset(
        key="macro",
        label="🔬 Macro",
        environment="dark polished surface, minimal props, isolated subject",
        lighting="ring light diffused, soft front fill, micro-specular highlights",
        camera="Laowa 24mm f/14 2X Macro Probe lens, extreme close-up, f/14",
        material="PBR textures, subsurface scattering, ultra-fine surface micro-detail",
        action_physics="visible pores, surface moisture, crystalline texture fragments",
        quality_rules="8k resolution, sharp critical focus on subject, photorealistic",
        rendering_hint="",
        hard_constraints=[
            "ultra-sharp product detail",
            "no background distractions",
            "no text",
        ],
        negative_prompt=[
            "blurry", "soft focus", "low resolution", "noise", "grain",
            "text", "watermark", "busy background",
        ],
    ),
    "cinematic": StylePreset(
        key="cinematic",
        label="🎬 Cinematic",
        environment="dramatic scene, deep shadows, atmospheric haze",
        lighting="Rembrandt key light, cinematic rim backlight, high contrast chiaroscuro",
        camera="85mm prime lens, f/1.8, shallow depth of field, slight anamorphic lens distortion",
        material="film grain texture, natural color grading, slight vignette",
        action_physics="lens flare, bokeh background, motion blur on ambient elements",
        quality_rules="8k resolution, cinematic color grade, photorealistic, no artifacts",
        rendering_hint="",
        hard_constraints=[
            "cinematic aspect ratio feel",
            "no flat or evenly-lit backgrounds",
            "no text",
        ],
        negative_prompt=[
            "flat lighting", "overexposed", "low quality", "cartoon",
            "text", "watermark", "cheerful bright tones",
        ],
    ),
    "comic": StylePreset(
        key="comic",
        label="🎨 Komik",
        environment="dynamic action background, speed lines, halftone dot pattern",
        lighting="flat diffused lighting, bold shadows, cel-shaded look",
        camera="dynamic angle, exaggerated perspective",
        material="cel-shaded surfaces, bold ink outlines, flat color fills",
        action_physics="action lines, impact explosion effects, exaggerated motion",
        quality_rules="vibrant colors, clean sharp edges, no blurry lines",
        rendering_hint="comic book illustration style, clean vector-like output",
        hard_constraints=[
            "bold ink outlines on all subjects",
            "flat color panels",
            "no photorealistic textures",
        ],
        negative_prompt=[
            "photorealistic", "blurry", "soft gradients", "dull colors",
            "3D render", "photography", "watermark",
        ],
    ),
    "infographic": StylePreset(
        key="infographic",
        label="📊 Infografis",
        environment="clean white or solid neutral background, evenly lit, no shadows",
        lighting="perfectly flat even lighting, no shadows, no gradients",
        camera="orthographic front view, no perspective distortion",
        material="flat vector surfaces, crisp sharp edges, solid color fills",
        action_physics="",
        quality_rules="8k resolution, perfectly sharp edges, no gradients, clean output",
        rendering_hint="vector art style, minimalist corporate flat design",
        hard_constraints=[
            "perfectly flat background",
            "no shadows or lighting effects",
            "no photographic textures",
        ],
        negative_prompt=[
            "shadows", "gradients", "photorealistic", "bokeh",
            "depth of field", "lens effects", "watermark", "busy background",
        ],
    ),
    "isometric_3d": StylePreset(
        key="isometric_3d",
        label="🏙️ 3D Miniatur",
        environment="charming miniature cityscape, clean studio surface, soft ambient occlusion",
        lighting="soft ambient light with subtle directional fill, warm afternoon glow",
        camera="isometric 30-degree angle, tilt-shift lens effect, miniature depth-of-field blur",
        material="PBR materials, blind-box toy plastic aesthetic, subtle subsurface scattering",
        action_physics="tilt-shift miniature effect, shallow focus mid-ground blur",
        quality_rules="ultra-detailed 3D render, 8k resolution, rich in details and realism, no artifacts, clean render",
        rendering_hint="Cinema 4D or Octane Render, blind-box toy aesthetic, isometric cityscape",
        hard_constraints=[
            "isometric 30-degree angle strictly maintained",
            "miniature scale aesthetic",
            "no realistic photography style",
        ],
        negative_prompt=[
            "top-down flat view", "lens distortion", "photorealistic photography",
            "blurry", "low quality", "artifacts", "watermark",
        ],
    ),
    "product_hero": StylePreset(
        key="product_hero",
        label="📦 Foto Produk Pro",
        environment="dark dramatic studio background or surreal organic environment, product as hero center-stage",
        lighting="dramatic rim backlight with edge glow, soft fill from front, specular highlights on product surface",
        camera="100mm macro lens, f/2.8, shallow depth of field, heroic low angle",
        material="glass reflections, caustic light patterns, metallic surface sheen, liquid surface tension detail",
        action_physics="condensation droplets on cold surface OR floating weightless mid-air OR water splash impact OR lens flare, AI selects based on product type",
        quality_rules="hyper-realistic 4K, ultra-sharp product detail, photorealistic, no artifacts",
        rendering_hint="hyper-realistic cinematic commercial photography, advertising campaign aesthetic",
        hard_constraints=[
            "product logo clearly visible and sharp",
            "no random text or words in scene",
            "no watermarks",
            "product shape and color preserved accurately",
        ],
        negative_prompt=[
            "blurry product", "distorted logo", "text", "watermark",
            "flat lighting", "overexposed", "plastic-looking", "low quality",
        ],
    ),
    "blueprint": StylePreset(
        key="blueprint",
        label="📐 Blueprint",
        environment="dark navy or white technical drafting background, grid lines",
        lighting="flat technical lighting, no shadows, no gradients",
        camera="orthographic front or isometric view, no perspective",
        material="wireframe lines, technical annotation style, precise edge rendering",
        action_physics="",
        quality_rules="crisp sharp technical lines, high contrast, no blur, clean output",
        rendering_hint="technical blueprint illustration, architectural drafting aesthetic",
        hard_constraints=[
            "technical drawing style strictly",
            "clear measurement lines or grid",
            "no photorealistic textures",
        ],
        negative_prompt=[
            "photorealistic", "shadows", "bokeh", "organic textures",
            "watermark", "low quality", "blurry lines",
        ],
    ),
}


class PromptBuilder:
    """Assembles the final image generation prompt from modular layers."""

    @staticmethod
    def get_preset(style_key: str) -> StylePreset:
        mapped_style_key = resolve_style_preset(style_key)
        preset = STYLE_PRESETS.get(mapped_style_key)
        if preset is None:
            logger.warning(f"Unknown style key '{style_key}', falling back to 'auto'.")
            preset = STYLE_PRESETS["auto"]
        return preset

    @staticmethod
    def build(
        visual_prompt: str,
        style_key: str = "auto",
        text_instruction: str = "",
        brand_suffix: str = "",
        preserve_product: bool = False,
    ) -> str:
        preset = PromptBuilder.get_preset(style_key)
        segments: list = []

        if visual_prompt:
            segments.append(visual_prompt)
        if preset.environment:
            segments.append(preset.environment)
        if preset.lighting:
            segments.append(preset.lighting)
        if preset.camera:
            segments.append(preset.camera)
        if preset.material:
            segments.append(preset.material)
        if preset.action_physics:
            segments.append(preset.action_physics)
        if preset.quality_rules:
            segments.append(preset.quality_rules)
        if preset.rendering_hint:
            segments.append(preset.rendering_hint)
        if text_instruction:
            segments.append(text_instruction)
        if brand_suffix:
            segments.append(brand_suffix)
        if preset.hard_constraints:
            segments.append(f"STRICT RULES: {', '.join(preset.hard_constraints)}")
        if preserve_product:
            segments.append(
                "CRITICAL: preserve the original product's shape, color, label, "
                "and identity exactly. Only replace the background and environment."
            )

        return ", ".join(filter(None, segments))

    @staticmethod
    def build_negative_prompt(style_key: str, extra_negatives=None) -> str:
        preset = PromptBuilder.get_preset(style_key)
        negatives = list(preset.negative_prompt)
        if extra_negatives:
            negatives.extend(extra_negatives)
        return ", ".join(negatives)

    @staticmethod
    def get_all_style_keys() -> list:
        return list(STYLE_PRESETS.keys())

    @staticmethod
    def get_style_labels() -> dict:
        return {key: preset.label for key, preset in STYLE_PRESETS.items()}


# Backward-compatible STYLE_SUFFIXES — keeps existing imports working
STYLE_SUFFIXES: dict = {
    key: PromptBuilder.build(visual_prompt="", style_key=key)
    for key in STYLE_PRESETS
}
