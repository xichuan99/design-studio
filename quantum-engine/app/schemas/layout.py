from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class LayoutElement(BaseModel):
    role: str = Field(..., description="The role of the element, e.g., 'headline', 'cta', 'product', 'logo'")
    width: float = Field(..., description="Width of the element in pixels")
    height: float = Field(..., description="Height of the element in pixels")
    pinned: bool = Field(False, description="If true, the element cannot be moved by the optimizer")
    x: Optional[float] = Field(None, description="Current X coordinate (required if pinned is true)")
    y: Optional[float] = Field(None, description="Current Y coordinate (required if pinned is true)")

class LayoutRequest(BaseModel):
    canvas_width: int = Field(..., description="Width of the design canvas in pixels")
    canvas_height: int = Field(..., description="Height of the design canvas in pixels")
    elements: List[LayoutElement] = Field(..., description="List of elements to be placed on the canvas")
    strategy: Literal["balanced", "minimal_overlap", "golden_ratio"] = Field(
        "balanced", description="Optimization strategy to use"
    )
    num_variations: int = Field(1, ge=1, le=5, description="Number of variations to generate")

class OptimizedPosition(BaseModel):
    role: str = Field(..., description="The role of the element")
    x: float = Field(..., description="Optimized X coordinate in absolute pixels")
    y: float = Field(..., description="Optimized Y coordinate in absolute pixels")

class LayoutResponse(BaseModel):
    variations: List[List[OptimizedPosition]] = Field(..., description="List of layout variations, each containing positions for all unpinned elements")
    energy_score: float = Field(..., description="Energy score of the optimal solution (lower is better)")
    solver_time_ms: int = Field(..., description="Time taken by the quantum solver in milliseconds")
