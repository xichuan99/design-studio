from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "error_code": "NOT_FOUND",
            "detail": "Project not found"
        }
    })

    error_code: str = Field(..., description="A short string code for the error type", json_schema_extra={"example": "NOT_FOUND"})
    detail: str = Field(..., description="A human-readable explanation of the error", json_schema_extra={"example": "Project not found"})


class ErrorResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "error": {
                "error_code": "NOT_FOUND",
                "detail": "Project not found"
            },
            "request_id": "req_12345"
        }
    })

    error: ErrorDetail = Field(..., description="The details of the error")
    request_id: Optional[str] = Field(None, description="The unique ID of the request that caused the error", json_schema_extra={"example": "req_12345"})


ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Bad Request"},
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    402: {"model": ErrorResponse, "description": "Payment Required (Insufficient Credits)"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not Found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    422: {"model": ErrorResponse, "description": "Validation Error"},
    429: {"model": ErrorResponse, "description": "Too Many Requests"},
    500: {"model": ErrorResponse, "description": "Internal Server Error"},
}
