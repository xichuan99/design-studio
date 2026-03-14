from pydantic import BaseModel, ConfigDict, UUID4
from datetime import datetime
from typing import List


class CreditTransactionResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    amount: int
    balance_after: int
    description: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreditHistoryResponse(BaseModel):
    transactions: List[CreditTransactionResponse]
    total_count: int
