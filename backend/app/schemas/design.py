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


class ImageProviderPreference(str, Enum):
    AUTO = "auto"


class ReferenceFocusPreference(str, Enum):
    AUTO = "auto"
    HUMAN = "human"
    OBJECT = "object"


class DesignGenerationRequest(BaseModel):
    raw_text: str = Field(
        ...,
        description="Raw promotional text from the user",
        json_schema_extra={"example": "Promo Seblak Pedas, Diskon 50% khusus Jumat"},
    )
    mode: Optional[str] = Field(
        "generate", description="Mode of generation (generate or redesign)"
    )
    reference_image_url: Optional[str] = Field(
        None, description="URL to a reference image"
    )
    reference_focus: ReferenceFocusPreference = Field(
        ReferenceFocusPreference.AUTO,
        description="Reference subject focus for i2i guidance: auto, human, or object",
    )
    template_id: Optional[str] = Field(None, description="ID of the starting template")
    aspect_ratio: AspectRatio = Field(
        AspectRatio.SQUARE, description="Desired aspect ratio"
    )
    style_preference: StylePreference = Field(
        StylePreference.BOLD,
        description="[Deprecated] Gaya visual. Sekarang dideskripsikan langsung di raw_text.",
    )
    color_palette_override: Optional[List[str]] = Field(
        None,
        description="Override colors with specific hex codes",
        json_schema_extra={"example": ["#FF5733", "#1A1A2E"]},
    )
    num_variations: int = Field(
        3, ge=1, le=4, description="Number of variations to generate"
    )
    integrated_text: bool = Field(
        False,
        description="Whether to instruct the image AI to render text directly into the pixels",
    )
    image_provider: ImageProviderPreference = Field(
        ImageProviderPreference.AUTO,
        description="Image provider selection. 'auto' uses the Fal.ai routing.",
    )
    clarification_answers: Optional[dict] = Field(
        None,
        description="User's answers to the clarification questions",
        json_schema_extra={"example": {"Target Audience": "Remaja"}},
    )
    headline_override: Optional[str] = Field(
        None,
        description="Use this exact headline as the source of truth when provided.",
    )
    sub_headline_override: Optional[str] = Field(
        None,
        description="Use this exact sub-headline as the source of truth when provided.",
    )
    cta_override: Optional[str] = Field(
        None,
        description="Use this exact CTA as the source of truth when provided.",
    )
    product_name: Optional[str] = Field(
        None,
        description="Optional explicit product name to accompany the marketing brief.",
    )
    offer_text: Optional[str] = Field(
        None,
        description="Optional explicit offer text to accompany the marketing brief.",
    )
    use_ai_copy_assist: bool = Field(
        True,
        description="Whether AI may assist when explicit copy fields are incomplete.",
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
    seed: Optional[str] = Field(
        None, description="Optional seed for reproducible generation"
    )
    quality: str = Field(
        "auto",
        description="Model tier selector: auto, basic, pro, ultra. Legacy values standard/ultra are still accepted.",
        pattern="^(auto|basic|pro|ultra|standard)$",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "raw_text": "Promo Seblak Pedas, Diskon 50% khusus Jumat",
                "aspect_ratio": "1:1",
                "image_provider": "auto",
                "num_variations": 2,
            }
        }
    )


class ReferenceAnalysis(BaseModel):
    style_description: str = Field(
        ..., description="Deskripsi gaya, tone, dan mood dari gambar referensi."
    )
    dominant_colors: List[str] = Field(
        ..., description="Daftar kode heksadesimal warna dominan dari gambar referensi."
    )
    mood: str = Field(..., description="Suasana atau emosi utama yang ditangkap.")
    suggested_prompt_suffix: str = Field(
        ..., description="Sufiks prompt instruksi gaya untuk model i2i."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "style_description": "Clean, modern, and minimalist.",
                "dominant_colors": ["#FFFFFF", "#000000", "#FF0000"],
                "mood": "Professional and energetic.",
                "suggested_prompt_suffix": "clean, modern, minimalist style, professional, energetic mood",
            }
        }
    )


class RedesignRequest(BaseModel):
    reference_image_url: str = Field(
        ..., description="URL gambar referensi untuk didesain ulang."
    )
    raw_text: str = Field(
        "", description="Teks atau brief tambahan opsional dari pengguna."
    )
    strength: float = Field(
        0.65,
        ge=0.3,
        le=0.85,
        description="Intensitas transformasi (0.3 konservatif - 0.85 kreatif).",
    )
    aspect_ratio: AspectRatio = Field(
        AspectRatio.SQUARE, description="Rasio aspek desain baru."
    )
    style_preference: StylePreference = Field(
        StylePreference.BOLD, description="[Deprecated] Gaya visual pilihan."
    )
    image_provider: ImageProviderPreference = Field(
        ImageProviderPreference.AUTO,
        description="Image provider selection for redesign. 'auto' uses the Fal.ai routing.",
    )
    brand_kit_id: Optional[str] = Field(
        None, description="ID Brand Kit aktif (jika ada)."
    )

    preserve_product: bool = Field(
        False,
        description="Jika True, AI akan mempertahankan bentuk, warna, dan identitas produk asli.",
    )
    quality: str = Field(
        "auto",
        description="Model tier selector: auto, basic, pro, ultra. Legacy values standard/ultra are still accepted.",
        pattern="^(auto|basic|pro|ultra|standard)$",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "reference_image_url": "https://example.com/image.jpg",
                "raw_text": "Make it futuristic",
                "strength": 0.65,
                "aspect_ratio": "1:1",
                "image_provider": "auto",
                "preserve_product": False,
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
        json_schema_extra={"example": "Jual keripik pisang rasa coklat"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"product_description": "Jual keripik pisang rasa coklat"}
        }
    )


class CopywritingRequest(BaseModel):
    product_description: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Deskripsi produk/jasa",
        json_schema_extra={"example": "Jual keripik pisang"},
    )
    tone: str = Field(
        "persuasive",
        description="casual, professional, persuasive, funny",
        json_schema_extra={"example": "persuasive"},
    )
    brand_name: Optional[str] = Field(
        None,
        description="Nama brand (berasal dari Brand Kit jika aktif)",
        json_schema_extra={"example": "Keripik Mantap"},
    )
    clarification_answers: Optional[dict] = Field(
        None, description="Jawaban dari mini-interview klarifikasi"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product_description": "Jual keripik pisang",
                "tone": "persuasive",
            }
        }
    )


class CopywritingVariation(BaseModel):
    style: str = Field(
        ...,
        description="FOMO, Benefit, atau Social Proof",
        json_schema_extra={"example": "FOMO"},
    )
    headline: str = Field(
        ...,
        description="Headline utama (max 6 kata)",
        json_schema_extra={"example": "Diskon Gila-gilaan!"},
    )
    subline: str = Field(
        ...,
        description="Subline pendukung (max 15 kata)",
        json_schema_extra={"example": "Keripik pisang coklat lumer di mulut"},
    )
    cta: str = Field(
        ...,
        description="Call to action (max 4 kata)",
        json_schema_extra={"example": "Beli Sekarang"},
    )
    full_text: str = Field(
        ...,
        description="Format gabungan siap pakai untuk rawText",
        json_schema_extra={
            "example": "Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang"
        },
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "style": "FOMO",
                "headline": "Diskon Gila-gilaan!",
                "subline": "Keripik pisang coklat lumer di mulut",
                "cta": "Beli Sekarang",
                "full_text": "Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang",
            }
        }
    )


class CopywritingResponse(BaseModel):
    variations: List[CopywritingVariation] = Field(
        ..., description="List of generated copywriting variations"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "variations": [
                    {
                        "style": "FOMO",
                        "headline": "Diskon Gila-gilaan!",
                        "subline": "Keripik pisang coklat lumer di mulut",
                        "cta": "Beli Sekarang",
                        "full_text": "Diskon Gila-gilaan! Keripik pisang coklat lumer di mulut. Beli Sekarang",
                    }
                ]
            }
        }
    )


# --- Clarification Interview Models ---
class BriefQuestion(BaseModel):
    id: str = Field(
        ...,
        description="Unique identifier for the question",
        json_schema_extra={"example": "q1"},
    )
    question: str = Field(
        ...,
        description="The question text in Indonesian",
        json_schema_extra={"example": "Siapa target audiens Anda?"},
    )
    type: str = Field(
        ...,
        description="Question type: 'choice', 'text', or 'color_picker'",
        json_schema_extra={"example": "choice"},
    )
    options: Optional[List[str]] = Field(
        None,
        description="List of options if type is 'choice'",
        json_schema_extra={"example": ["Remaja", "Dewasa"]},
    )
    default: Optional[str] = Field(
        None,
        description="Suggested default answer",
        json_schema_extra={"example": "Remaja"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "q1",
                "question": "Siapa target audiens Anda?",
                "type": "choice",
                "options": ["Remaja", "Dewasa"],
                "default": "Remaja",
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
                        "default": "Remaja",
                    }
                ]
            }
        }
    )


# --- LLM Response Structure ---
class AITextLayout(BaseModel):
    x: float = Field(
        ...,
        description="Horizontal center position (0=left, 1=right)",
        json_schema_extra={"example": 0.5},
    )
    y: float = Field(
        ...,
        description="Vertical center position (0=top, 1=bottom)",
        json_schema_extra={"example": 0.2},
    )
    font_family: str = Field(
        "Inter",
        description="One of: Inter, Poppins, Roboto, Playfair Display, Montserrat, Oswald",
        json_schema_extra={"example": "Inter"},
    )
    font_size: int = Field(
        72,
        description="Font size in pixels for 1024px canvas",
        json_schema_extra={"example": 72},
    )
    font_weight: int = Field(
        700,
        description="Font weight (400=normal, 700=bold, 900=black)",
        json_schema_extra={"example": 700},
    )
    color: str = Field(
        "#FFFFFF", description="Hex color", json_schema_extra={"example": "#FFFFFF"}
    )
    align: str = Field(
        "center",
        description="Text alignment: left, center, right",
        json_schema_extra={"example": "center"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "x": 0.5,
                "y": 0.2,
                "font_family": "Inter",
                "font_size": 72,
                "font_weight": 700,
                "color": "#FFFFFF",
                "align": "center",
            }
        }
    )


class VisualPromptPart(BaseModel):
    category: str = Field(
        ...,
        description="one of: subject, setting, lighting, style, colors, camera, material",
        json_schema_extra={"example": "subject"},
    )
    label: str = Field(
        ...,
        description="Indonesian label for this part",
        json_schema_extra={"example": "Subjek Utama"},
    )
    value: str = Field(
        ...,
        description="The English prompt fragment",
        json_schema_extra={"example": "A bowl of spicy seblak"},
    )
    enabled: bool = Field(
        True,
        description="Whether this part is active",
        json_schema_extra={"example": True},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "category": "subject",
                "label": "Subjek Utama",
                "value": "A bowl of spicy seblak",
                "enabled": True,
            }
        }
    )


class ParsedTextElements(BaseModel):
    headline: str = Field(
        ..., description="Main headline", json_schema_extra={"example": "Promo Seblak"}
    )
    sub_headline: Optional[str] = Field(
        None, description="Sub headline", json_schema_extra={"example": "Pedas Gila!"}
    )
    cta: Optional[str] = Field(
        None,
        description="Call to Action",
        json_schema_extra={"example": "Beli Sekarang"},
    )
    visual_prompt: str = Field(
        ...,
        description="The full combined AI image prompt inferred from the text context",
        json_schema_extra={
            "example": "A bowl of spicy seblak on a wooden table, vibrant colors, professional photography"
        },
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the visual_prompt",
        json_schema_extra={
            "example": "Semangkuk seblak pedas di atas meja kayu dengan warna cerah dan fotografi profesional."
        },
    )
    visual_prompt_parts: List[VisualPromptPart] = Field(
        default_factory=list,
        description="Categorized parts of the visual prompt for granular editing",
    )
    suggested_colors: List[str] = Field(
        default_factory=list,
        description="Suggested hex colors",
        json_schema_extra={"example": ["#FF0000", "#000000"]},
    )

    headline_layout: Optional[AITextLayout] = None
    sub_headline_layout: Optional[AITextLayout] = None
    cta_layout: Optional[AITextLayout] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "headline": "Promo Seblak",
                "visual_prompt": "A bowl of spicy seblak...",
                "indonesian_translation": "Semangkuk seblak pedas...",
            }
        }
    )


class CompositionMetadata(BaseModel):
    set_num: int
    ratio: str
    copy_space_side: str
    layout_name: Optional[str] = None
    validation_flags: List[str] = Field(default_factory=list)


class GeneratedVariation(BaseModel):
    set_num: int
    composition: CompositionMetadata
    image_prompt_modifier: Optional[str] = None
    layout_elements: List[dict] = Field(default_factory=list)
    result_url: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    created_at: Optional[str] = None
    result_url: Optional[str] = None
    headline: Optional[str] = None
    sub_headline: Optional[str] = None
    cta: Optional[str] = None
    visual_prompt: Optional[str] = None
    quantum_layout: Optional[str] = None
    variation_results: Optional[str] = None
    seed: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


class ModifyPromptRequest(BaseModel):
    original_prompt_parts: List[VisualPromptPart] = Field(
        ..., description="List of original prompt parts"
    )
    original_visual_prompt: str = Field(
        ...,
        description="The original full visual prompt for context",
        json_schema_extra={"example": "A bowl of spicy seblak on a wooden table..."},
    )
    user_instruction: str = Field(
        ...,
        description="User's instruction in Indonesian to modify the prompt",
        json_schema_extra={"example": "Tolong tambahkan telur ceplok"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "original_visual_prompt": "A bowl of spicy seblak on a wooden table...",
                "user_instruction": "Tolong tambahkan telur ceplok",
                "original_prompt_parts": [],
            }
        }
    )


class ModifyPromptResponse(BaseModel):
    modified_prompt_parts: List[VisualPromptPart] = Field(
        ..., description="List of updated prompt parts"
    )
    modified_visual_prompt: str = Field(
        ...,
        description="The combined updated visual prompt",
        json_schema_extra={
            "example": "A bowl of spicy seblak with a fried egg on a wooden table..."
        },
    )
    indonesian_translation: str = Field(
        ...,
        description="A simple, friendly Indonesian explanation/translation of the modified_visual_prompt",
        json_schema_extra={"example": "Semangkuk seblak pedas dengan telur ceplok..."},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "modified_visual_prompt": "A bowl of spicy seblak with a fried egg on a wooden table...",
                "indonesian_translation": "Semangkuk seblak pedas dengan telur ceplok...",
                "modified_prompt_parts": [],
            }
        }
    )


# --- Future Week 2/3 Response Models ---
class TextLayer(BaseModel):
    id: str = Field(
        ..., description="Layer ID", json_schema_extra={"example": "layer_1"}
    )
    role: str = Field(
        ...,
        description="Layer role (headline, cta, etc)",
        json_schema_extra={"example": "headline"},
    )
    text: str = Field(
        ..., description="Text content", json_schema_extra={"example": "Promo!"}
    )
    font_family: str = Field(
        "Poppins", description="Font family", json_schema_extra={"example": "Poppins"}
    )
    font_weight: int = Field(
        700, description="Font weight", json_schema_extra={"example": 700}
    )
    font_size: int = Field(
        48, description="Font size", json_schema_extra={"example": 48}
    )
    color: str = Field(
        "#FFFFFF", description="Hex color", json_schema_extra={"example": "#FFFFFF"}
    )
    text_align: str = Field(
        "center", description="Text alignment", json_schema_extra={"example": "center"}
    )
    x: float = Field(
        ..., description="X coordinate", json_schema_extra={"example": 100.0}
    )
    y: float = Field(
        ..., description="Y coordinate", json_schema_extra={"example": 100.0}
    )
    rotation: float = Field(
        0.0, description="Rotation in degrees", json_schema_extra={"example": 0.0}
    )
    opacity: float = Field(
        1.0, description="Opacity (0.0 - 1.0)", json_schema_extra={"example": 1.0}
    )
    shadow: Optional[str] = Field(
        "2px 2px 4px rgba(0,0,0,0.5)",
        description="CSS text shadow",
        json_schema_extra={"example": "2px 2px 4px rgba(0,0,0,0.5)"},
    )
    background_box: Optional[str] = Field(
        None,
        description="CSS background color for text box",
        json_schema_extra={"example": "rgba(0,0,0,0.5)"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "layer_1",
                "role": "headline",
                "text": "Promo!",
                "x": 100.0,
                "y": 100.0,
            }
        }
    )


class DesignVariation(BaseModel):
    background_image_url: str = Field(
        ...,
        description="URL of the generated background image",
        json_schema_extra={"example": "https://example.com/bg.png"},
    )
    text_layers: List[TextLayer] = Field(
        ..., description="List of text layers placed over the background"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "background_image_url": "https://example.com/bg.png",
                "text_layers": [],
            }
        }
    )


class DesignGenerationResponse(BaseModel):
    job_id: str = Field(
        ..., description="Job ID for tracking", json_schema_extra={"example": "job_123"}
    )
    project_id: str = Field(
        ...,
        description="Project ID associated with this generation",
        json_schema_extra={"example": "proj_123"},
    )
    status: str = Field(
        ...,
        description="Status of generation",
        json_schema_extra={"example": "completed"},
    )
    variations: List[DesignVariation] = Field(
        default_factory=list, description="List of generated design variations"
    )
    credits_used: int = Field(
        0,
        description="Credits used for this generation",
        json_schema_extra={"example": 2},
    )
    credits_remaining: int = Field(
        0,
        description="Credits remaining after generation",
        json_schema_extra={"example": 8},
    )
    generation_time_ms: Optional[int] = Field(
        None,
        description="Time taken to generate in milliseconds",
        json_schema_extra={"example": 5000},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "job_123",
                "project_id": "proj_123",
                "status": "completed",
                "credits_used": 2,
                "credits_remaining": 8,
            }
        }
    )


class MagicTextRequest(BaseModel):
    image_base64: str = Field(
        ...,
        description="Base64 encoded string of the current canvas image",
        json_schema_extra={"example": "data:image/png;base64,iVBORw0KGgo..."},
    )
    text: str = Field(
        ...,
        description="The raw promotional text to lay out",
        json_schema_extra={"example": "Diskon 50%"},
    )
    canvas_width: int = Field(
        1024, description="Width of the canvas", json_schema_extra={"example": 1024}
    )
    canvas_height: int = Field(
        1024, description="Height of the canvas", json_schema_extra={"example": 1024}
    )
    style_hint: Optional[str] = Field(
        None,
        description="Optional style preset direction",
        json_schema_extra={"example": "Bold & Impactful"},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "image_base64": "data:image/png;base64,iVBORw0KGgo...",
                "text": "Diskon 50%",
                "canvas_width": 1024,
                "canvas_height": 1024,
            }
        }
    )


class MagicTextElement(BaseModel):
    text: str = Field(
        ..., description="Text content", json_schema_extra={"example": "Diskon 50%"}
    )
    font_family: str = Field(
        "Inter", description="Font family", json_schema_extra={"example": "Inter"}
    )
    font_size: int = Field(
        48, description="Font size", json_schema_extra={"example": 48}
    )
    font_weight: int = Field(
        700, description="Font weight", json_schema_extra={"example": 700}
    )
    color: str = Field(
        "#FFFFFF", description="Hex color", json_schema_extra={"example": "#FFFFFF"}
    )
    align: str = Field(
        "center", description="Text alignment", json_schema_extra={"example": "center"}
    )
    x: float = Field(
        ...,
        description="Proportional x-coordinate (0.0-1.0)",
        json_schema_extra={"example": 0.5},
    )
    y: float = Field(
        ...,
        description="Proportional y-coordinate (0.0-1.0)",
        json_schema_extra={"example": 0.5},
    )
    letter_spacing: float = Field(
        0.0, description="Letter spacing in em", json_schema_extra={"example": 0.0}
    )
    line_height: float = Field(
        1.2, description="Line height multiplier", json_schema_extra={"example": 1.2}
    )
    text_transform: str = Field(
        "none",
        description="Text transform: 'none', 'uppercase', or 'capitalize'",
        json_schema_extra={"example": "uppercase"},
    )
    text_shadow: Optional[str] = Field(
        None,
        description="CSS-like text shadow",
        json_schema_extra={"example": "2px 2px 8px rgba(0,0,0,0.6)"},
    )
    opacity: float = Field(
        1.0, description="Opacity from 0.0 to 1.0", json_schema_extra={"example": 1.0}
    )
    rotation: float = Field(
        0.0, description="Rotation in degrees", json_schema_extra={"example": 0.0}
    )
    background_color: Optional[str] = Field(
        None,
        description="Background color behind text",
        json_schema_extra={"example": "rgba(0,0,0,0.6)"},
    )
    background_padding: float = Field(
        0,
        description="Padding around text in px when background_color is set",
        json_schema_extra={"example": 16},
    )
    background_radius: float = Field(
        0,
        description="Border radius of the background box in px",
        json_schema_extra={"example": 8},
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "Diskon 50%",
                "x": 0.5,
                "y": 0.5,
                "font_family": "Inter",
                "font_size": 48,
            }
        }
    )


class MagicTextResponse(BaseModel):
    elements: List[MagicTextElement] = Field(
        default_factory=list, description="List of generated magic text elements"
    )

    model_config = ConfigDict(json_schema_extra={"example": {"elements": []}})


class GenerateTitleRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="The user's description or prompt",
        json_schema_extra={"example": "Banner promo seblak"},
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"prompt": "Banner promo seblak"}}
    )


class GenerateTitleResponse(BaseModel):
    title: str = Field(
        ...,
        description="The AI-generated short title",
        json_schema_extra={"example": "Promo Seblak"},
    )

    model_config = ConfigDict(json_schema_extra={"example": {"title": "Promo Seblak"}})
