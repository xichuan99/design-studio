from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal
from uuid import UUID
from datetime import datetime


class ColorSwatch(BaseModel):
    hex: str = Field(..., description="Hex color code, e.g., #FF5733", example="#FF5733")
    name: str = Field(..., description="Color name in Indonesian", example="Oranye Terang")
    role: Literal["primary", "secondary", "accent", "background", "text"] = Field(
        ..., description="Logical role: primary, secondary, accent, background, text", example="primary"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "hex": "#FF5733",
                "name": "Oranye Terang",
                "role": "primary"
            }
        }
    )


class Typography(BaseModel):
    primaryFont: Optional[str] = Field(None, description="Primary font family name", example="Inter")
    secondaryFont: Optional[str] = Field(None, description="Secondary font family name", example="Roboto")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "primaryFont": "Inter",
                "secondaryFont": "Roboto"
            }
        }
    )


class BrandKitBase(BaseModel):
    name: str = Field(..., description="Name of the brand kit", example="Brand Kit Utama")
    logo_url: Optional[str] = Field(
        None, description="URL of the uploaded logo (legacy/single logo)", example="https://example.com/logo.png"
    )
    logos: Optional[List[str]] = Field(
        default_factory=list, description="List of logo URLs", example=["https://example.com/logo.png"]
    )
    colors: List[ColorSwatch] = Field(..., min_length=1, max_length=10, description="List of brand colors")
    typography: Optional[Typography] = Field(None, description="Typography settings")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Brand Kit Utama",
                "logo_url": "https://example.com/logo.png",
                "logos": ["https://example.com/logo.png"],
                "colors": [
                    {
                        "hex": "#FF5733",
                        "name": "Oranye Terang",
                        "role": "primary"
                    }
                ],
                "typography": {
                    "primaryFont": "Inter",
                    "secondaryFont": "Roboto"
                }
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
                    {
                        "hex": "#FF5733",
                        "name": "Oranye Terang",
                        "role": "primary"
                    }
                ],
                "typography": {
                    "primaryFont": "Inter",
                    "secondaryFont": "Roboto"
                }
            }
        }
    )


class BrandKitUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the brand kit", example="Brand Kit Baru")
    logo_url: Optional[str] = Field(None, description="URL of the uploaded logo (legacy/single logo)", example="https://example.com/logo2.png")
    logos: Optional[List[str]] = Field(None, description="List of logo URLs", example=["https://example.com/logo2.png"])
    colors: Optional[List[ColorSwatch]] = Field(None, description="List of brand colors")
    typography: Optional[Typography] = Field(None, description="Typography settings")
    is_active: Optional[bool] = Field(None, description="Whether this brand kit is active", example=True)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Brand Kit Baru",
                "is_active": True
            }
        }
    )


class BrandKitResponse(BrandKitBase):
    id: UUID = Field(..., description="Unique brand kit ID", example="123e4567-e89b-12d3-a456-426614174000")
    user_id: UUID = Field(..., description="User ID associated with the brand kit", example="123e4567-e89b-12d3-a456-426614174001")
    is_active: bool = Field(..., description="Whether this brand kit is active", example=True)
    created_at: datetime = Field(..., description="Brand kit creation timestamp", example="2024-03-15T12:00:00Z")

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
                    {
                        "hex": "#FF5733",
                        "name": "Oranye Terang",
                        "role": "primary"
                    }
                ]
            }
        }
    )


class ColorExtractionResponse(BaseModel):
    colors: List[ColorSwatch] = Field(..., description="Extracted colors")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "colors": [
                    {
                        "hex": "#FF5733",
                        "name": "Oranye Terang",
                        "role": "primary"
                    }
                ]
            }
        }
    )
