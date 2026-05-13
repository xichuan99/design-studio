from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, UUID4


CreditPurchaseStatus = Literal["pending", "paid", "failed", "expired", "canceled"]
CreditPackCode = Literal["credit_pack_starter", "credit_pack_pro", "credit_pack_business"]


class CreditPack(BaseModel):
    code: CreditPackCode
    label: str
    credits_added: int
    amount: int
    currency: str


class CreditPackListResponse(BaseModel):
    items: list[CreditPack]


class CreditPurchaseIntentRequest(BaseModel):
    pack_code: CreditPackCode = Field(..., description="Selected credit pack code")


class CreditPurchaseIntentResponse(BaseModel):
    purchase_id: UUID4
    status: CreditPurchaseStatus
    checkout_url: str
    pack_code: CreditPackCode
    credits_added: int
    amount: int
    currency: str


class CreditPurchaseResponse(BaseModel):
    id: UUID4
    pack_code: str
    credits_added: int
    amount: int
    currency: str
    provider: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CreditPurchaseListResponse(BaseModel):
    items: list[CreditPurchaseResponse]
    total_count: int
