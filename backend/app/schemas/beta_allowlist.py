"""Schema for beta allowlist operations."""

from pydantic import BaseModel, Field
from typing import Optional
import uuid


class BetaAllowlistEntryCreate(BaseModel):
    """Request to add a new allowlist entry."""
    entry_type: str = Field(..., description="'email' or 'code'")
    entry_value: str = Field(..., description="The email address or invite code")
    beta_cohort: Optional[str] = Field(None, description="e.g., 'wave_1', 'partner_beta'")
    initial_credits_grant: int = Field(0, description="Extra credits to grant on signup (in addition to signup bonus)")
    notes: Optional[str] = Field(None, description="Admin notes")


class BetaAllowlistEntryUpdate(BaseModel):
    """Request to update an allowlist entry."""
    status: Optional[str] = Field(None, description="'active' or 'inactive'")
    initial_credits_grant: Optional[int] = Field(None, description="Extra credits to grant")
    notes: Optional[str] = Field(None, description="Admin notes")


class BetaAllowlistEntryResponse(BaseModel):
    """Response for an allowlist entry."""
    id: uuid.UUID
    entry_type: str
    entry_value: str
    status: str
    beta_cohort: Optional[str]
    initial_credits_grant: int
    used_count: int
    last_used_at: Optional[str]  # ISO format datetime
    created_at: str  # ISO format datetime
    created_by: Optional[str]
    notes: Optional[str]


class BetaAllowlistListResponse(BaseModel):
    """Paginated list of allowlist entries."""
    items: list[BetaAllowlistEntryResponse]
    total_count: int


class BetaAllowlistCheckRequest(BaseModel):
    """Request to check if an email or code is on the allowlist."""
    entry_type: str = Field(..., description="'email' or 'code'")
    entry_value: str = Field(..., description="The email address or invite code to check")
