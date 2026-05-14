"""Backend-owned funnel analytics events.

These events act as the source of truth for visitor -> signup and related
weekly review metrics, so we do not rely on PostHog for the core paid-beta
funnel.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id = Column(String(255), nullable=False, index=True)
    event_name = Column(String(64), nullable=False, index=True)
    source = Column(String(64), nullable=False, default="frontend", index=True)
    variant = Column(String(64), nullable=True, index=True)
    auth_method = Column(String(32), nullable=True, index=True)
    event_properties = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False, index=True)
