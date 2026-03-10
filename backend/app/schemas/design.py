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
    integrated_text: bool = Field(False, description="Whether to instruct the image AI to render text directly into the pixels")

# --- LLM Response Structure ---
class AITextLayout(BaseModel):
    """Layout for a single text element, coordinates are proportional (0.0-1.0)."""
    x: float = Field(..., description="Horizontal center position (0=left, 1=right)")
    y: float = Field(..., description="Vertical center position (0=top, 1=bottom)")
    font_family: str = Field("Inter", description="One of: Inter, Poppins, Roboto, Playfair Display, Montserrat, Oswald")
    font_size: int = Field(72, description="Font size in pixels for 1024px canvas")
    font_weight: int = Field(700, description="Font weight (400=normal, 700=bold, 900=black)")
    color: str = Field("#FFFFFF", description="Hex color")
    align: str = Field("center", description="Text alignment: left, center, right")

class VisualPromptPart(BaseModel):
    category: str = Field(..., description="one of: subject, setting, lighting, style, colors")
    label: str = Field(..., description="Indonesian label for this part")
    value: str = Field(..., description="The English prompt fragment")
    enabled: bool = Field(True, description="Whether this part is active")

class ParsedTextElements(BaseModel):
    headline: str
    sub_headline: Optional[str] = None
    cta: Optional[str] = None
    visual_prompt: str = Field(..., description="The full combined AI image prompt inferred from the text context")
    indonesian_translation: str = Field(..., description="A simple, friendly Indonesian explanation/translation of the visual_prompt")
    visual_prompt_parts: List[VisualPromptPart] = Field(default_factory=list, description="Categorized parts of the visual prompt for granular editing")
    suggested_colors: List[str] = Field(default_factory=list)

    # AI Layout Decisions
    headline_layout: Optional[AITextLayout] = None
    sub_headline_layout: Optional[AITextLayout] = None
    cta_layout: Optional[AITextLayout] = None

class ModifyPromptRequest(BaseModel):
    original_prompt_parts: List[VisualPromptPart]
    user_instruction: str = Field(..., description="User's instruction in Indonesian to modify the prompt")

class ModifyPromptResponse(BaseModel):
    modified_prompt_parts: List[VisualPromptPart]
    modified_visual_prompt: str = Field(..., description="The combined updated visual prompt")
    indonesian_translation: str = Field(..., description="A simple, friendly Indonesian explanation/translation of the modified_visual_prompt")

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
