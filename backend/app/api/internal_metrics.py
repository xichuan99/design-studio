import secrets
from typing import Optional

from fastapi import APIRouter, Header

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.services.llm_metrics import get_llm_metrics_snapshot

router = APIRouter(tags=["Internal"])


@router.get("/llm-metrics")
async def get_internal_llm_metrics(x_internal_token: Optional[str] = Header(default=None)):
    configured_token = settings.INTERNAL_METRICS_TOKEN.strip()
    if not configured_token:
        raise ForbiddenError(detail="INTERNAL_METRICS_TOKEN is not configured")

    if not x_internal_token:
        raise UnauthorizedError(detail="Missing X-Internal-Token header")

    if not secrets.compare_digest(x_internal_token, configured_token):
        raise UnauthorizedError(detail="Invalid internal token")

    return get_llm_metrics_snapshot()