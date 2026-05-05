from typing import List, Optional

from pydantic import BaseModel, Field


class ModelCatalogResponseItem(BaseModel):
    tier: str = Field(..., description="Model tier key")
    label: str = Field(..., description="UI label")
    description: str = Field(..., description="Human readable description")
    supported_tools: List[str] = Field(default_factory=list)
    default_for_user: bool = Field(..., description="Whether this tier is default for current user")
    accessible: bool = Field(..., description="Whether current user can access this tier")
    reason: Optional[str] = Field(None, description="Reason when tier is locked")


class ModelCatalogResponse(BaseModel):
    items: List[ModelCatalogResponseItem]
