from pydantic import BaseModel, ConfigDict, UUID4, Field
from datetime import datetime
from typing import List


class CreditTransactionResponse(BaseModel):
    id: UUID4 = Field(..., description="Unique transaction ID", example="550e8400-e29b-41d4-a716-446655440000")
    user_id: UUID4 = Field(..., description="ID of the user who made the transaction", example="123e4567-e89b-12d3-a456-426614174000")
    amount: int = Field(..., description="Amount of credits added (positive) or deducted (negative)", example=-1)
    balance_after: int = Field(..., description="User's credit balance after the transaction", example=9)
    description: str = Field(..., description="Description of the transaction", example="Hapus background")
    created_at: datetime = Field(..., description="Timestamp of the transaction", example="2024-03-15T12:05:00Z")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "amount": -1,
                "balance_after": 9,
                "description": "Hapus background",
                "created_at": "2024-03-15T12:05:00Z"
            }
        }
    )


class CreditHistoryResponse(BaseModel):
    transactions: List[CreditTransactionResponse] = Field(..., description="List of credit transactions")
    total_count: int = Field(..., description="Total number of transactions available", example=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "transactions": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "amount": -1,
                        "balance_after": 9,
                        "description": "Hapus background",
                        "created_at": "2024-03-15T12:05:00Z"
                    }
                ],
                "total_count": 1
            }
        }
    )
