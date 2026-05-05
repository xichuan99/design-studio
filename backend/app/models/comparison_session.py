import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class ComparisonSession(Base):
    __tablename__ = "comparison_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    raw_text = Column(Text, nullable=False)
    aspect_ratio = Column(String(10), nullable=False, default="1:1")
    integrated_text = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="queued", index=True)
    share_slug = Column(String(64), nullable=False, unique=True, index=True)
    requested_tiers = Column(JSON, nullable=False, default=list)
    variants_json = Column(JSON, nullable=False, default=list)
    charged_credits = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
