from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

# --- Request Enums & Models ---
class AspectRatio(str, Enum):
    SQUARE = "1:1"
    STORY = "9:16"
    LANDSCAPE = "16:9"

class StylePreference(str, Enum):
    BOLD = "bold"
    MINIMALIST = "minimalist"
    ELEGANT = "elegant"
    PLAYFUL = "playful"

class DesignGenerationRequest(BaseModel):
    raw_text: str = Field(..., json_schema_extra={"example": "Promo Seblak Pedas, Diskon 50% khusus Jumat"})
    reference_image_url: Optional[str] = None
    template_id: Optional[str] = None
    aspect_ratio: AspectRatio = AspectRatio.SQUARE
    style_preference: StylePreference = StylePreference.BOLD
    color_palette_override: Optional[List[str]] = Field(None, json_schema_extra={"example": ["#FF5733", "#1A1A2E"]})
    num_variations: int = Field(2, ge=1, le=4)
    integrated_text: bool = Field(
        False,
        description="Whether to instruct the image AI to render text directly into the pixels"
    )
    clarification_answers: Optional[dict] = Field(
        None,
        description="User's answers to the clarification questions"
    )

    # Sprint 2: Brand Kit
    brand_kit_id: Optional[str] = Field(
        None,
        description="Active Brand Kit ID to apply color palette"
    )

    # Sprint 1: Background removal from Create page
    product_image_url: Optional[str] = Field(
        None,
        description="URL of the uploaded product image to be composited"
    )
    remove_product_bg: bool = Field(
        False,
        description="Whether the product image should have its background removed before compositing"
    )

# --- Sprint 3: AI Copywriting Models ---
class CopywritingClarifyRequest(BaseModel):
    product_description: str = Field(..., min_length=5, max_length=500, description="Singkat produk/jasa yang ditawarkan")

class CopywritingRequest(BaseModel):
    product_description: str = Field(..., min_length=5, max_length=500, description="Deskripsi produk/jasa")
    tone: str = Field(
        "persuasive",
        description="casual, professional, persuasive, funny"
    )
    brand_name: Optional[str] = Field(
        None,
        description="Nama brand (berasal dari Brand Kit jika aktif)"
    )
    clarification_answers: Optional[dict] = Field(
        None,
        description="Jawaban dari mini-interview klarifikasi"
    )

class CopywritingVariation(BaseModel):
    style: str = Field(
        ...,
        description="FOMO, Benefit, atau Social Proof"
    )
    headline: str = Field(
        ...,
        description="Headline utama (max 6 kata)"
    )
    subline: str = Field(
        ...,
        description="Subline pendukung (max 15 kata)"
    )
    cta: str = Field(
        ...,
        description="Call to action (max 4 kata)"
    )
    full_text: str = Field(
        ...,
        description="Format gabungan siap pakai untuk rawText"
    )

class CopywritingResponse(BaseModel):
    variations: List[CopywritingVariation]

# --- Clarification Interview Models ---
class BriefQuestion(BaseModel):
    id: str = Field(
        ...,
        description="Unique identifier for the question"
    )
    question: str = Field(
        ...,
        description="The question text in Indonesian"
    )
    type: str = Field(
        ...,
        description="Question type: 'choice', 'text', or 'color_picker'"
    )
    options: Optional[List[str]] = Field(
        None,
        description="List of options if type is 'choice'"
    )
    default: Optional[str] = Field(
        None,
        description="Suggested default answer"
    )

class BriefQuestionsResponse(BaseModel):
    questions: List[BriefQuestion] = Field(
        ...,
        description="List of 3-4 clarification questions"
    )

# --- LLM Response Structure ---
class AITextLayout(BaseModel):
    """Layout for a single text element, coordinates are proportional (0.0-1.0)."""
    x: float = Field(
        ...,
        description="Horizontal center position (0=left, 1=right)"
    )
    y: float = Field(
        ...,
        description="Vertical center position (0=top, 1=bottom)"
    )
    font_family: str = Field(
        "Inter",
        description="One of: Inter, Poppins, Roboto, Playfair Display, Montserrat, Oswald"
    )
    font_size: int = Field(
        72,
        description="Font size in pixels for 1024px canvas"
    )
    font_weight: int = Field(
        700,
        description="Font weight (400=normal, 700=bold, 900=black)"
    )
    color: str = Field(
        "#FFFFFF",
        description="Hex color"
    )
    align: str = Field(
        "center",
        description="Text alignment: left, center, right"
    )

class VisualPromptPart(BaseModel):
    category: str = Field(
        ...,
        description="one of: subject, setting, lighting, style, colors"
    )
    label: str = Field(
        ...,
        description="Indonesian label for this part"
    )
    value: str = Field(
        ...,
        description="The English prompt fragment"
    )
    enabled: bool = Field(
        True,
        description="Whether this part is active"
    )

class ParsedTextElements(BaseModel):
    headline: str
    sub_headline: Optional[str] = None
    cta: Optional[str] = None
    visual_prompt: str = Field(
        ...,
        description="The full combined AI image prompt inferred from the text context"
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the visual_prompt"
    )
    visual_prompt_parts: List[VisualPromptPart] = Field(
        default_factory=list,
        description="Categorized parts of the visual prompt for granular editing"
    )
    suggested_colors: List[str] = Field(
        default_factory=list)

    # AI Layout Decisions
    headline_layout: Optional[AITextLayout] = None
    sub_headline_layout: Optional[AITextLayout] = None
    cta_layout: Optional[AITextLayout] = None

class ModifyPromptRequest(BaseModel):
    original_prompt_parts: List[VisualPromptPart]
    original_visual_prompt: str = Field(...,
        description="The original full visual prompt for context"
    )
    user_instruction: str = Field(
        ...,
        description="User's instruction in Indonesian to modify the prompt"
    )

class ModifyPromptResponse(BaseModel):
    modified_prompt_parts: List[VisualPromptPart]
    modified_visual_prompt: str = Field(
        ...,
        description="The combined updated visual prompt"
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the modified_visual_prompt"
    )

# --- Future Week 2/3 Response Models ---
class TextLayer(BaseModel):
    id: str
    role: str
    text: str
    font_family: str = "Poppins"
    font_weight: int = 700
    font_size: int = 48
    color: str = "#FFFFFF"
    text_align: str = "center"
    x: float
    y: float
    rotation: float = 0.0
    opacity: float = 1.0
    shadow: Optional[str] = "2px 2px 4px rgba(0,0,0,0.5)"
    background_box: Optional[str] = None

class DesignVariation(BaseModel):
    background_image_url: str
    text_layers: List[TextLayer]

class DesignGenerationResponse(BaseModel):
    job_id: str
    project_id: str
    status: str
    variations: List[DesignVariation] = []
    credits_used: int = 0
    credits_remaining: int = 0
    generation_time_ms: Optional[int] = None

class MagicTextRequest(BaseModel):
    image_base64: str = Field(
        ...,
        description="Base64 encoded string of the current canvas image"
    )
    text: str = Field(
        ...,
        description="The raw promotional text to lay out"
    )
    canvas_width: int = Field(
        1024,
        description="Width of the canvas"
    )
    canvas_height: int = Field(
        1024,
        description="Height of the canvas"
    )
    style_hint: Optional[str] = Field(
        None,
        description="Optional style preset direction (e.g., 'Bold & Impactful', 'Elegant & Clean')"
    )

class MagicTextElement(BaseModel):
    text: str = Field(
        ...)
    font_family: str = Field("Inter")
    font_size: int = Field(48)
    font_weight: int = Field(700)
    color: str = Field("#FFFFFF")
    align: str = Field("center")
    x: float = Field(...,
        description="Proportional x-coordinate (0.0-1.0)"
    )
    y: float = Field(
        ...,
        description="Proportional y-coordinate (0.0-1.0)"
    )
    # Advanced Typography Fields
    letter_spacing: float = Field(
        0.0,
        description="Letter spacing in em (e.g., 0.05, 0.2). Use larger for elegant/serif headlines."
    )
    line_height: float = Field(
        1.2,
        description="Line height multiplier (e.g., 1.1 for headlines, 1.5 for body)."
    )
    text_transform: str = Field(
        "none",
        description="Text transform: 'none', 'uppercase', or 'capitalize'"
    )
    text_shadow: Optional[str] = Field(
        None,
        description="CSS-like text shadow (e.g., '2px 2px 8px rgba(0,0,0,0.6)') for better contrast"
    )
    opacity: float = Field(
        1.0,
        description="Opacity from 0.0 to 1.0. Use for subtle sub-headlines."
    )
    rotation: float = Field(
        0.0,
        description="Rotation in degrees. Usually 0, but can be slight for playful styles."
    )
    background_color: Optional[str] = Field(
        None,
        description="Background color behind text (e.g. 'rgba(0,0,0,0.6)'). Use when background is noisy."
    )
    background_padding: float = Field(
        0,
        description="Padding around text in px when background_color is set (e.g., 16)"
    )
    background_radius: float = Field(
        0,
        description="Border radius of the background box in px (e.g., 8)"
    )

class MagicTextResponse(BaseModel):
    elements: List[MagicTextElement] = Field(default_factory=list)

class GenerateTitleRequest(BaseModel):
    prompt: str = Field(..., description="The user's description or prompt")

class GenerateTitleResponse(BaseModel):
    title: str = Field(..., description="The AI-generated short title")
