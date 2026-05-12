"""Audit ledger for AI usage, credits, provider, and refund lifecycle."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class AiUsageEvent(Base):
    __tablename__ = "ai_usage_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    ai_tool_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ai_tool_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    credit_transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("credit_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    refund_transaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("credit_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    operation = Column(String(80), nullable=False, index=True)
    source = Column(String(50), nullable=False, default="backend")
    status = Column(String(30), nullable=False, default="charged", index=True)
    provider = Column(String(80), nullable=True, index=True)
    model = Column(String(120), nullable=True, index=True)
    quality = Column(String(40), nullable=True)

    estimated_cost = Column(Numeric(12, 6), nullable=True)
    actual_cost = Column(Numeric(12, 6), nullable=True)
    currency = Column(String(10), nullable=False, default="USD")
    credits_charged = Column(Integer, nullable=False, default=0)
    error_code = Column(String(80), nullable=True)
    error_message = Column(Text, nullable=True)
    event_metadata = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
