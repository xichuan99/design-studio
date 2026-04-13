from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal
from uuid import UUID
from datetime import datetime


class ColorSwatch(BaseModel):
    hex: str = Field(
        ...,
        description="Hex color code, e.g., #FF5733",
        json_schema_extra={"example": "#FF5733"},
    )
    name: str = Field(
        ...,
        description="Color name in Indonesian",
        json_schema_extra={"example": "Oranye Terang"},
    )
    role: Literal["primary", "secondary", "accent", "background", "text"] = Field(
        ...,
        description="Logical role: primary, secondary, accent, background, text",
        json_schema_extra={"example": "primary"},
    )
    reasoning: Optional[str] = Field(
        None, description="Psychological reasoning for this color"
    )
    application: Optional[str] = Field(None, description="How to use this color")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "hex": "#FF5733",
                "name": "Oranye Terang",
                "role": "primary",
                "reasoning": "Oranye menciptakan kesan energik...",
                "application": "Tombol CTA & logo",
            }
        }
    )


class Typography(BaseModel):
    primaryFont: Optional[str] = Field(
        None,
        description="Primary font family name",
        json_schema_extra={"example": "Inter"},
    )
    primaryFontSource: Optional[str] = Field(None)
    primaryFontReasoning: Optional[str] = Field(None)
    primaryFontUse: Optional[str] = Field(None)

    secondaryFont: Optional[str] = Field(
        None,
        description="Secondary font family name",
        json_schema_extra={"example": "Roboto"},
    )
    secondaryFontSource: Optional[str] = Field(None)
    secondaryFontReasoning: Optional[str] = Field(None)
    secondaryFontUse: Optional[str] = Field(None)

    hierarchy: Optional[dict] = Field(None, description="Font sizes, weights, and spacing")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "primaryFont": "Inter",
                "secondaryFont": "Roboto",
                "hierarchy": {"h1": {"size": "64px"}},
            }
        }
    )


class BrandKitBase(BaseModel):
    name: str = Field(
        ...,
        description="Name of the brand kit",
        json_schema_extra={"example": "Brand Kit Utama"},
    )
    logo_url: Optional[str] = Field(
        None,
        description="URL of the uploaded logo (legacy/single logo)",
        json_schema_extra={"example": "https://example.com/logo.png"},
    )
    logos: Optional[List[str]] = Field(
        default_factory=list,
        description="List of logo URLs",
        json_schema_extra={"example": ["https://example.com/logo.png"]},
    )
    colors: List[ColorSwatch] = Field(
        ..., min_length=1, max_length=10, description="List of brand colors"
    )
    typography: Optional[Typography] = Field(None, description="Typography settings")
    brand_strategy: Optional[dict] = Field(None, description="Brand strategy details")
    folder_id: Optional[UUID] = Field(
        None,
        description="ID of the folder this brand kit belongs to",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Brand Kit Utama",
                "logo_url": "https://example.com/logo.png",
                "logos": ["https://example.com/logo.png"],
                "colors": [
                    {"hex": "#FF5733", "name": "Oranye Terang", "role": "primary"}
                ],
                "typography": {"primaryFont": "Inter", "secondaryFont": "Roboto"},
                "brand_strategy": {"personality": ["bold", "modern"]},
            }
        }
    )


class BrandKitCreate(BrandKitBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Brand Kit Utama",
                "logo_url": "https://example.com/logo.png",
                "logos": ["https://example.com/logo.png"],
                "colors": [
                    {"hex": "#FF5733", "name": "Oranye Terang", "role": "primary"}
                ],
                "typography": {"primaryFont": "Inter", "secondaryFont": "Roboto"},
            }
        }
    )


class BrandKitUpdate(BaseModel):
    name: Optional[str] = Field(
        None,
        description="Name of the brand kit",
        json_schema_extra={"example": "Brand Kit Baru"},
    )
    logo_url: Optional[str] = Field(
        None,
        description="URL of the uploaded logo (legacy/single logo)",
        json_schema_extra={"example": "https://example.com/logo2.png"},
    )
    logos: Optional[List[str]] = Field(
        None,
        description="List of logo URLs",
        json_schema_extra={"example": ["https://example.com/logo2.png"]},
    )
    colors: Optional[List[ColorSwatch]] = Field(
        None, description="List of brand colors"
    )
    typography: Optional[Typography] = Field(None, description="Typography settings")
    brand_strategy: Optional[dict] = Field(None, description="Brand strategy details")
    is_active: Optional[bool] = Field(
        None,
        description="Whether this brand kit is active",
        json_schema_extra={"example": True},
    )
    folder_id: Optional[UUID] = Field(
        None,
        description="ID of the folder this brand kit belongs to",
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "Brand Kit Baru", "is_active": True}}
    )


class BrandKitResponse(BrandKitBase):
    id: UUID = Field(
        ...,
        description="Unique brand kit ID",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174000"},
    )
    user_id: UUID = Field(
        ...,
        description="User ID associated with the brand kit",
        json_schema_extra={"example": "123e4567-e89b-12d3-a456-426614174001"},
    )
    is_active: bool = Field(
        ...,
        description="Whether this brand kit is active",
        json_schema_extra={"example": True},
    )
    created_at: datetime = Field(
        ...,
        description="Brand kit creation timestamp",
        json_schema_extra={"example": "2024-03-15T12:00:00Z"},
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "name": "Brand Kit Utama",
                "is_active": True,
                "created_at": "2024-03-15T12:00:00Z",
                "colors": [
                    {"hex": "#FF5733", "name": "Oranye Terang", "role": "primary"}
                ],
            }
        },
    )


class ColorExtractionResponse(BaseModel):
    colors: List[ColorSwatch] = Field(..., description="Extracted colors")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "colors": [
                    {"hex": "#FF5733", "name": "Oranye Terang", "role": "primary"}
                ]
            }
        }
    )


class BrandKitGenerateRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="Description of the business to generate brand kit for",
        json_schema_extra={
            "example": "Kedai kopi modern minimalis bernama 'Kopi Senja'"
        },
    )
    brand_personality: List[str] = Field(default_factory=list, description="Array of brand traits")
    target_audience: str = Field("", description="Target audience description")
    design_style: str = Field("", description="Preferred visual design style")
    emotional_tone: str = Field("", description="Primary emotion the brand should trigger")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "Kedai kopi modern minimalis bernama 'Kopi Senja'",
                "brand_personality": ["modern", "minimalist", "calm"],
                "target_audience": "Pekerja kantoran usia 25-35 tahun",
                "design_style": "minimalis",
                "emotional_tone": "tenang dan fokus",
            }
        }
    )


class BrandKitExtractUrlRequest(BaseModel):
    url: str = Field(
        ...,
        description="URL of the website to extract brand kit from",
        json_schema_extra={"example": "https://stripe.com"},
    )

    model_config = ConfigDict(
        json_schema_extra={"example": {"url": "https://stripe.com"}}
    )
