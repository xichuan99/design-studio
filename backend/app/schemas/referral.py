from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ReferralApplyRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=32)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        cleaned = (value or "").strip().upper()
        if not cleaned:
            raise ValueError("Referral code is required")
        return cleaned


class AppliedReferralStatus(BaseModel):
    referrer_name: str
    status: str
    reward_credits: int
    applied_at: datetime
    verified_at: Optional[datetime] = None
    credited_at: Optional[datetime] = None


class ReferralApplyResponse(BaseModel):
    status: str
    message: str
    referral: AppliedReferralStatus


class ReferralSummary(BaseModel):
    pending_count: int
    verified_count: int
    credits_earned_total: int


class ReferralStatusResponse(BaseModel):
    referral_code: str
    summary: ReferralSummary
    applied_referral: Optional[AppliedReferralStatus] = None
