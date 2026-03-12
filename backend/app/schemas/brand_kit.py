from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class ColorSwatch(BaseModel):
    hex: str = Field(..., description="Hex color code, e.g., #FF5733")
    name: str = Field(..., description="Color name in Indonesian")
    role: str = Field(
        ...,
        description="Logical role: primary, secondary, accent, background, text"
    )


class BrandKitBase(BaseModel):
    name: str = Field(
        ..., json_schema_extra={"example": "Brand Kit Utama"}
    )
    logo_url: Optional[str] = Field(
        None,
        description="URL of the uploaded logo"
    )
    colors: List[ColorSwatch] = Field(..., min_length=1, max_length=10)


class BrandKitCreate(BrandKitBase):
    pass


class BrandKitUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    colors: Optional[List[ColorSwatch]] = None
    is_active: Optional[bool] = None


class BrandKitResponse(BrandKitBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime


class ColorExtractionResponse(BaseModel):
    colors: List[ColorSwatch]
