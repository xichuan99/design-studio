"""Model for async AI tool jobs and progress tracking."""

import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class AiToolJob(Base):
    __tablename__ = "ai_tool_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    tool_name = Column(String(50), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="queued", index=True)

    payload_json = Column(JSON, nullable=False, default=dict)
    result_url = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    phase_message = Column(String(200), nullable=True)

    progress_percent = Column(Integer, nullable=False, default=0)
    provider_latency_ms = Column(Integer, nullable=True)

    idempotency_key = Column(String(255), nullable=True)
    cancel_requested = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
