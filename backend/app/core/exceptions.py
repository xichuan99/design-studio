from typing import Dict, Optional


class AppException(Exception):
    """Base class for all application exceptions."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "INTERNAL_ERROR",
        headers: Optional[Dict[str, str]] = None,
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers
        super().__init__(detail)


class NotFoundError(AppException):
    def __init__(
        self,
        detail: str = "Resource not found",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(
            status_code=404, detail=detail, error_code="NOT_FOUND", headers=headers
        )


class ValidationError(AppException):
    def __init__(
        self, detail: str = "Validation error", headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=422,
            detail=detail,
            error_code="VALIDATION_ERROR",
            headers=headers,
        )


class InsufficientCreditsError(AppException):
    def __init__(
        self,
        detail: str = "Insufficient credits",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(
            status_code=402,
            detail=detail,
            error_code="INSUFFICIENT_CREDITS",
            headers=headers,
        )


class UnauthorizedError(AppException):
    def __init__(
        self, detail: str = "Unauthorized", headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=401, detail=detail, error_code="UNAUTHORIZED", headers=headers
        )


class ForbiddenError(AppException):
    def __init__(
        self, detail: str = "Forbidden", headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=403, detail=detail, error_code="FORBIDDEN", headers=headers
        )


class ConflictError(AppException):
    def __init__(
        self, detail: str = "Conflict", headers: Optional[Dict[str, str]] = None
    ):
        super().__init__(
            status_code=409, detail=detail, error_code="CONFLICT", headers=headers
        )


class InternalServerError(AppException):
    def __init__(
        self,
        detail: str = "Internal server error",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(
            status_code=500, detail=detail, error_code="INTERNAL_ERROR", headers=headers
        )


class ExternalServiceError(AppException):
    """Exception raised when an external service (Gemini, Fal.ai, etc) fails."""

    def __init__(
        self,
        detail: str = "External service error",
        error_code: str = "EXTERNAL_SERVICE_ERROR",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(
            status_code=502, detail=detail, error_code=error_code, headers=headers
        )


class LLMGenerationError(ExternalServiceError):
    def __init__(self, detail: str = "LLM failed to generate content"):
        super().__init__(detail=detail, error_code="LLM_GENERATION_FAILED")


class ImageGenerationError(ExternalServiceError):
    def __init__(self, detail: str = "Image generation failed"):
        super().__init__(detail=detail, error_code="IMAGE_GENERATION_FAILED")
