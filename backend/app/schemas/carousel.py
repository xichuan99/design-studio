from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


CarouselTone = Literal[
    "professional",
    "friendly",
    "bold",
    "educational",
    "playful",
]

CarouselFontStyle = Literal[
    "modern",
    "editorial",
    "warm",
    "technical",
    "expressive",
    "classic",
    "rounded",
]


class CarouselBrandTokens(BaseModel):
    primary: str
    light: str
    dark: str
    light_bg: str
    dark_bg: str
    border: str
    heading_font: str
    body_font: str


class CarouselSlide(BaseModel):
    index: int = Field(ge=1)
    type: str = Field(min_length=2, max_length=32)
    headline: str = Field(min_length=1, max_length=90)
    body: str = Field(min_length=1, max_length=220)
    cta: Optional[str] = Field(default=None, max_length=40)


class CarouselGenerateRequest(BaseModel):
    topic: str = Field(min_length=8, max_length=180)
    brand_name: str = Field(min_length=2, max_length=60)
    ig_handle: Optional[str] = Field(default=None, max_length=40)
    primary_color: str = Field(min_length=7, max_length=7)
    font_style: CarouselFontStyle = "modern"
    tone: CarouselTone = "professional"
    num_slides: int = Field(default=7, ge=5, le=10)

    @field_validator("primary_color")
    @classmethod
    def validate_hex_color(cls, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 7 or not normalized.startswith("#"):
            raise ValueError("primary_color must be a valid hex color like #6C5CE7")

        try:
            int(normalized[1:], 16)
        except ValueError as exc:
            raise ValueError(
                "primary_color must be a valid hex color like #6C5CE7"
            ) from exc

        return normalized


class CarouselGenerateResponse(BaseModel):
    carousel_id: str
    brand_tokens: CarouselBrandTokens
    slides: list[CarouselSlide]


class CarouselRegenerateSlideRequest(CarouselGenerateRequest):
    carousel_id: str = Field(min_length=3, max_length=80)
    slide_index: int = Field(ge=1, le=10)
    instruction: Optional[str] = Field(default=None, max_length=180)
    slides: list[CarouselSlide] = Field(min_length=5, max_length=10)


class CarouselRegenerateSlideResponse(BaseModel):
    slide: CarouselSlide


class CarouselExportRequest(BaseModel):
    carousel_id: str = Field(min_length=3, max_length=80)
    brand_name: str = Field(min_length=2, max_length=60)
    ig_handle: Optional[str] = Field(default=None, max_length=40)
    brand_tokens: CarouselBrandTokens
    slides: list[CarouselSlide] = Field(min_length=5, max_length=10)
