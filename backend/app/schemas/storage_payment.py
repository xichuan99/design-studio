from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, UUID4


StoragePurchaseStatus = Literal["pending", "paid", "failed", "expired", "canceled"]
StorageProvider = Literal["manual"]
StorageAddonCode = Literal["storage_plus_5gb", "storage_plus_20gb"]


class StorageAddon(BaseModel):
    code: StorageAddonCode
    label: str
    bytes_added: int
    amount: int
    currency: str


class StorageAddonListResponse(BaseModel):
    items: list[StorageAddon]


class StoragePurchaseIntentRequest(BaseModel):
    addon_code: StorageAddonCode = Field(..., description="Selected storage addon code")


class StoragePurchaseIntentResponse(BaseModel):
    purchase_id: UUID4
    status: StoragePurchaseStatus
    checkout_url: str
    addon_code: StorageAddonCode
    bytes_added: int
    amount: int
    currency: str


class StoragePurchaseResponse(BaseModel):
    id: UUID4
    addon_code: str
    bytes_added: int
    amount: int
    currency: str
    provider: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StoragePurchaseListResponse(BaseModel):
    items: list[StoragePurchaseResponse]
    total_count: int


class StorageWebhookRequest(BaseModel):
    event_id: str = Field(..., description="Unique payment event id from provider")
    purchase_id: UUID4
    status: Literal["paid", "failed", "expired", "canceled"]
    provider_txn_id: Optional[str] = None


class StorageWebhookResponse(BaseModel):
    accepted: bool
    already_processed: bool = False
    purchase_id: UUID4
    status: str
