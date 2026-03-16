"""Model for tracking AI tool results (Background Swap, Upscale, etc.)."""

import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class AiToolResult(Base):
    __tablename__ = "ai_tool_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    tool_name = Column(String(50), nullable=False, index=True)
    result_url = Column(Text, nullable=False)
    input_summary = Column(String(200), nullable=True)
    file_size = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
