from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum


# --- Request Enums & Models ---
class AspectRatio(str, Enum):
    SQUARE = "1:1"
    STORY = "9:16"
    LANDSCAPE = "16:9"
    POST = "4:5"


class StylePreference(str, Enum):
    BOLD = "bold"
    MINIMALIST = "minimalist"
    ELEGANT = "elegant"
    PLAYFUL = "playful"


class DesignGenerationRequest(BaseModel):
    raw_text: str = Field(
        ...,
        description="Raw promotional text from the user",
        example="Promo Seblak Pedas, Diskon 50% khusus Jumat",
    )
    reference_image_url: Optional[str] = Field(None, description="URL to a reference image")
    template_id: Optional[str] = Field(None, description="ID of the starting template")
    aspect_ratio: AspectRatio = Field(AspectRatio.SQUARE, description="Desired aspect ratio")
    style_preference: StylePreference = Field(StylePreference.BOLD, description="Desired visual style")
    color_palette_override: Optional[List[str]] = Field(
        None, description="Override colors with specific hex codes", example=["#FF5733", "#1A1A2E"]
    )
    num_variations: int = Field(2, ge=1, le=4, description="Number of variations to generate")
    integrated_text: bool = Field(
        False,
        description="Whether to instruct the image AI to render text directly into the pixels",
    )
    clarification_answers: Optional[dict] = Field(
        None, description="User's answers to the clarification questions", example={"Target Audience": "Remaja"}
    )
    brand_kit_id: Optional[str] = Field(
        None, description="Active Brand Kit ID to apply color palette"
    )
    product_image_url: Optional[str] = Field(
        None, description="URL of the uploaded product image to be composited"
    )
    remove_product_bg: bool = Field(
        False,
        description="Whether the product image should have its background removed before compositing",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "raw_text": "Promo Seblak Pedas, Diskon 50% khusus Jumat",
                "aspect_ratio": "1:1",
                "style_preference": "bold",
                "num_variations": 2
            }
        }
    )


# --- Sprint 3: AI Copywriting Models ---
class CopywritingClarifyRequest(BaseModel):
    product_description: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Singkat produk/jasa yang ditawarkan",
        example="Jual keripik pisang rasa coklat"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product_description": "Jual keripik pisang rasa coklat"
            }
        }
    )


class CopywritingRequest(BaseModel):
    product_description: str = Field(
        ..., min_length=5, max_length=500, description="Deskripsi produk/jasa", example="Jual keripik pisang"
    )
    tone: str = Field(
        "persuasive", description="casual, professional, persuasive, funny", example="persuasive"
    )
    brand_name: Optional[str] = Field(
        None, description="Nama brand (berasal dari Brand Kit jika aktif)", example="Keripik Mantap"
    )
    clarification_answers: Optional[dict] = Field(
        None, description="Jawaban dari mini-interview klarifikasi"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product_description": "Jual keripik pisang",
                "tone": "persuasive"
            }
        }
    )


class CopywritingVariation(BaseModel):
    style: str = Field(..., description="FOMO, Benefit, atau Social Proof", example="FOMO")
    headline: str = Field(..., description="Headline utama (max 6 kata)", example="Diskon Gila-gilaan!")
    subline: str = Field(..., description="Subline pendukung (max 15 kata)", example="Keripik pisang coklat lumer di mulut")
    cta: str = Field(..., description="Call to action (max 4 kata)", example="Beli Sekarang")
    full_text: str = Field(..., description="Format gabungan siap pakai untuk rawText", example="Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "style": "FOMO",
                "headline": "Diskon Gila-gilaan!",
                "subline": "Keripik pisang coklat lumer di mulut",
                "cta": "Beli Sekarang",
                "full_text": "Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang"
            }
        }
    )


class CopywritingResponse(BaseModel):
    variations: List[CopywritingVariation] = Field(..., description="List of generated copywriting variations")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "variations": [
                    {
                        "style": "FOMO",
                        "headline": "Diskon Gila-gilaan!",
                        "subline": "Keripik pisang coklat lumer di mulut",
                        "cta": "Beli Sekarang",
                        "full_text": "Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang"
                    }
                ]
            }
        }
    )


# --- Clarification Interview Models ---
class BriefQuestion(BaseModel):
    id: str = Field(..., description="Unique identifier for the question", example="q1")
    question: str = Field(..., description="The question text in Indonesian", example="Siapa target audiens Anda?")
    type: str = Field(
        ..., description="Question type: 'choice', 'text', or 'color_picker'", example="choice"
    )
    options: Optional[List[str]] = Field(
        None, description="List of options if type is 'choice'", example=["Remaja", "Dewasa"]
    )
    default: Optional[str] = Field(None, description="Suggested default answer", example="Remaja")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "q1",
                "question": "Siapa target audiens Anda?",
                "type": "choice",
                "options": ["Remaja", "Dewasa"],
                "default": "Remaja"
            }
        }
    )


class BriefQuestionsResponse(BaseModel):
    questions: List[BriefQuestion] = Field(
        ..., description="List of 3-4 clarification questions"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "questions": [
                    {
                        "id": "q1",
                        "question": "Siapa target audiens Anda?",
                        "type": "choice",
                        "options": ["Remaja", "Dewasa"],
                        "default": "Remaja"
                    }
                ]
            }
        }
    )


# --- LLM Response Structure ---
class AITextLayout(BaseModel):
    x: float = Field(..., description="Horizontal center position (0=left, 1=right)", example=0.5)
    y: float = Field(..., description="Vertical center position (0=top, 1=bottom)", example=0.2)
    font_family: str = Field(
        "Inter",
        description="One of: Inter, Poppins, Roboto, Playfair Display, Montserrat, Oswald",
        example="Inter"
    )
    font_size: int = Field(72, description="Font size in pixels for 1024px canvas", example=72)
    font_weight: int = Field(
        700, description="Font weight (400=normal, 700=bold, 900=black)", example=700
    )
    color: str = Field("#FFFFFF", description="Hex color", example="#FFFFFF")
    align: str = Field("center", description="Text alignment: left, center, right", example="center")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "x": 0.5,
                "y": 0.2,
                "font_family": "Inter",
                "font_size": 72,
                "font_weight": 700,
                "color": "#FFFFFF",
                "align": "center"
            }
        }
    )


class VisualPromptPart(BaseModel):
    category: str = Field(
        ..., description="one of: subject, setting, lighting, style, colors", example="subject"
    )
    label: str = Field(..., description="Indonesian label for this part", example="Subjek Utama")
    value: str = Field(..., description="The English prompt fragment", example="A bowl of spicy seblak")
    enabled: bool = Field(True, description="Whether this part is active", example=True)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": "subject",
                "label": "Subjek Utama",
                "value": "A bowl of spicy seblak",
                "enabled": True
            }
        }
    )


class ParsedTextElements(BaseModel):
    headline: str = Field(..., description="Main headline", example="Promo Seblak")
    sub_headline: Optional[str] = Field(None, description="Sub headline", example="Pedas Gila!")
    cta: Optional[str] = Field(None, description="Call to Action", example="Beli Sekarang")
    visual_prompt: str = Field(
        ...,
        description="The full combined AI image prompt inferred from the text context",
        example="A bowl of spicy seblak on a wooden table, vibrant colors, professional photography"
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the visual_prompt",
        example="Semangkuk seblak pedas di atas meja kayu dengan warna cerah dan fotografi profesional."
    )
    visual_prompt_parts: List[VisualPromptPart] = Field(
        default_factory=list,
        description="Categorized parts of the visual prompt for granular editing",
    )
    suggested_colors: List[str] = Field(default_factory=list, description="Suggested hex colors", example=["#FF0000", "#000000"])

    headline_layout: Optional[AITextLayout] = None
    sub_headline_layout: Optional[AITextLayout] = None
    cta_layout: Optional[AITextLayout] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "headline": "Promo Seblak",
                "visual_prompt": "A bowl of spicy seblak...",
                "indonesian_translation": "Semangkuk seblak pedas..."
            }
        }
    )


class ModifyPromptRequest(BaseModel):
    original_prompt_parts: List[VisualPromptPart] = Field(..., description="List of original prompt parts")
    original_visual_prompt: str = Field(
        ..., description="The original full visual prompt for context", example="A bowl of spicy seblak on a wooden table..."
    )
    user_instruction: str = Field(
        ..., description="User's instruction in Indonesian to modify the prompt", example="Tolong tambahkan telur ceplok"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "original_visual_prompt": "A bowl of spicy seblak on a wooden table...",
                "user_instruction": "Tolong tambahkan telur ceplok",
                "original_prompt_parts": []
            }
        }
    )


class ModifyPromptResponse(BaseModel):
    modified_prompt_parts: List[VisualPromptPart] = Field(..., description="List of updated prompt parts")
    modified_visual_prompt: str = Field(
        ..., description="The combined updated visual prompt", example="A bowl of spicy seblak with a fried egg on a wooden table..."
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the modified_visual_prompt",
        example="Semangkuk seblak pedas dengan telur ceplok..."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "modified_visual_prompt": "A bowl of spicy seblak with a fried egg on a wooden table...",
                "indonesian_translation": "Semangkuk seblak pedas dengan telur ceplok...",
                "modified_prompt_parts": []
            }
        }
    )


# --- Future Week 2/3 Response Models ---
class TextLayer(BaseModel):
    id: str = Field(..., description="Layer ID", example="layer_1")
    role: str = Field(..., description="Layer role (headline, cta, etc)", example="headline")
    text: str = Field(..., description="Text content", example="Promo!")
    font_family: str = Field("Poppins", description="Font family", example="Poppins")
    font_weight: int = Field(700, description="Font weight", example=700)
    font_size: int = Field(48, description="Font size", example=48)
    color: str = Field("#FFFFFF", description="Hex color", example="#FFFFFF")
    text_align: str = Field("center", description="Text alignment", example="center")
    x: float = Field(..., description="X coordinate", example=100.0)
    y: float = Field(..., description="Y coordinate", example=100.0)
    rotation: float = Field(0.0, description="Rotation in degrees", example=0.0)
    opacity: float = Field(1.0, description="Opacity (0.0 - 1.0)", example=1.0)
    shadow: Optional[str] = Field("2px 2px 4px rgba(0,0,0,0.5)", description="CSS text shadow", example="2px 2px 4px rgba(0,0,0,0.5)")
    background_box: Optional[str] = Field(None, description="CSS background color for text box", example="rgba(0,0,0,0.5)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "layer_1",
                "role": "headline",
                "text": "Promo!",
                "x": 100.0,
                "y": 100.0
            }
        }
    )


class DesignVariation(BaseModel):
    background_image_url: str = Field(..., description="URL of the generated background image", example="https://example.com/bg.png")
    text_layers: List[TextLayer] = Field(..., description="List of text layers placed over the background")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "background_image_url": "https://example.com/bg.png",
                "text_layers": []
            }
        }
    )


class DesignGenerationResponse(BaseModel):
    job_id: str = Field(..., description="Job ID for tracking", example="job_123")
    project_id: str = Field(..., description="Project ID associated with this generation", example="proj_123")
    status: str = Field(..., description="Status of generation", example="completed")
    variations: List[DesignVariation] = Field(default_factory=list, description="List of generated design variations")
    credits_used: int = Field(0, description="Credits used for this generation", example=2)
    credits_remaining: int = Field(0, description="Credits remaining after generation", example=8)
    generation_time_ms: Optional[int] = Field(None, description="Time taken to generate in milliseconds", example=5000)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "job_123",
                "project_id": "proj_123",
                "status": "completed",
                "credits_used": 2,
                "credits_remaining": 8
            }
        }
    )


class MagicTextRequest(BaseModel):
    image_base64: str = Field(
        ..., description="Base64 encoded string of the current canvas image", example="data:image/png;base64,iVBORw0KGgo..."
    )
    text: str = Field(..., description="The raw promotional text to lay out", example="Diskon 50%")
    canvas_width: int = Field(1024, description="Width of the canvas", example=1024)
    canvas_height: int = Field(1024, description="Height of the canvas", example=1024)
    style_hint: Optional[str] = Field(
        None,
        description="Optional style preset direction",
        example="Bold & Impactful"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "image_base64": "data:image/png;base64,iVBORw0KGgo...",
                "text": "Diskon 50%",
                "canvas_width": 1024,
                "canvas_height": 1024
            }
        }
    )


class MagicTextElement(BaseModel):
    text: str = Field(..., description="Text content", example="Diskon 50%")
    font_family: str = Field("Inter", description="Font family", example="Inter")
    font_size: int = Field(48, description="Font size", example=48)
    font_weight: int = Field(700, description="Font weight", example=700)
    color: str = Field("#FFFFFF", description="Hex color", example="#FFFFFF")
    align: str = Field("center", description="Text alignment", example="center")
    x: float = Field(..., description="Proportional x-coordinate (0.0-1.0)", example=0.5)
    y: float = Field(..., description="Proportional y-coordinate (0.0-1.0)", example=0.5)
    letter_spacing: float = Field(
        0.0,
        description="Letter spacing in em", example=0.0
    )
    line_height: float = Field(
        1.2,
        description="Line height multiplier", example=1.2
    )
    text_transform: str = Field(
        "none", description="Text transform: 'none', 'uppercase', or 'capitalize'", example="uppercase"
    )
    text_shadow: Optional[str] = Field(
        None,
        description="CSS-like text shadow", example="2px 2px 8px rgba(0,0,0,0.6)"
    )
    opacity: float = Field(
        1.0, description="Opacity from 0.0 to 1.0", example=1.0
    )
    rotation: float = Field(
        0.0,
        description="Rotation in degrees", example=0.0
    )
    background_color: Optional[str] = Field(
        None,
        description="Background color behind text", example="rgba(0,0,0,0.6)"
    )
    background_padding: float = Field(
        0,
        description="Padding around text in px when background_color is set", example=16
    )
    background_radius: float = Field(
        0, description="Border radius of the background box in px", example=8
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Diskon 50%",
                "x": 0.5,
                "y": 0.5,
                "font_family": "Inter",
                "font_size": 48
            }
        }
    )


class MagicTextResponse(BaseModel):
    elements: List[MagicTextElement] = Field(default_factory=list, description="List of generated magic text elements")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "elements": []
            }
        }
    )


class GenerateTitleRequest(BaseModel):
    prompt: str = Field(..., description="The user's description or prompt", example="Banner promo seblak")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "Banner promo seblak"
            }
        }
    )


class GenerateTitleResponse(BaseModel):
    title: str = Field(..., description="The AI-generated short title", example="Promo Seblak")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Promo Seblak"
            }
        }
    )
