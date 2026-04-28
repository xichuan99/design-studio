from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


CatalogType = Literal["product", "service"]
CatalogGoal = Literal["selling", "showcasing", "promo"]
CatalogTone = Literal["formal", "fun", "premium", "soft_selling"]


class CatalogBasicsRequest(BaseModel):
    catalog_type: CatalogType
    total_pages: int = Field(ge=3, le=24)
    goal: CatalogGoal
    tone: CatalogTone
    target_audience: Optional[str] = Field(default=None, max_length=140)
    language: str = Field(default="id", min_length=2, max_length=8)
    business_name: Optional[str] = Field(default=None, max_length=80)
    business_context: Optional[str] = Field(default=None, max_length=500)


class CatalogPagePlan(BaseModel):
    page_number: int = Field(ge=1)
    type: str = Field(min_length=2, max_length=50)
    layout: str = Field(min_length=2, max_length=50)
    content: Dict[str, Any] = Field(default_factory=dict)


class PlanStructureResponse(BaseModel):
    suggested_structure: List[CatalogPagePlan]
    missing_data: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class SuggestStylesRequest(BaseModel):
    basics: CatalogBasicsRequest
    structure: List[CatalogPagePlan] = Field(min_length=1)


class CatalogStyleOption(BaseModel):
    style: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=8, max_length=220)
    use_case: str = Field(min_length=4, max_length=120)
    layout: str = Field(min_length=4, max_length=120)


class SuggestStylesResponse(BaseModel):
    style_options: List[CatalogStyleOption] = Field(min_length=3, max_length=3)


class CatalogImageInput(BaseModel):
    image_id: str = Field(min_length=1, max_length=80)
    filename: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=255)


class ImageMappingRequest(BaseModel):
    basics: CatalogBasicsRequest
    structure: List[CatalogPagePlan] = Field(min_length=1)
    images: List[CatalogImageInput] = Field(min_length=1)


class CatalogImageMapping(BaseModel):
    image_id: str
    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    recommended_pages: List[int] = Field(default_factory=list)


class ImageMappingResponse(BaseModel):
    image_mapping: List[CatalogImageMapping]
    unassigned_images: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class GenerateCopyRequest(BaseModel):
    basics: CatalogBasicsRequest
    selected_style: str = Field(min_length=2, max_length=80)
    pages: List[CatalogPagePlan] = Field(min_length=1)
    business_data: Dict[str, Any] = Field(default_factory=dict)


class GenerateCopyResponse(BaseModel):
    pages: List[CatalogPagePlan]
    missing_data: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class FinalizePlanRequest(BaseModel):
    basics: CatalogBasicsRequest
    selected_style: str = Field(min_length=2, max_length=80)
    structure: List[CatalogPagePlan] = Field(min_length=1)
    image_mapping: List[CatalogImageMapping] = Field(default_factory=list)
    page_copy: List[CatalogPagePlan] = Field(default_factory=list)
    overrides: Dict[str, Any] = Field(default_factory=dict)


class FinalizePlanResponse(BaseModel):
    schema_version: str
    catalog_type: CatalogType
    total_pages: int = Field(ge=1)
    tone: CatalogTone
    style: str
    pages: List[CatalogPagePlan]
    missing_data: List[str] = Field(default_factory=list)
