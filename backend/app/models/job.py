"""Job model for tracking async image generation tasks."""

import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    folder_id = Column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Job status: queued | processing | completed | failed
    status = Column(String(20), default="queued", nullable=False, index=True)

    # Input data (stored as JSON string for replay)
    raw_text = Column(Text, nullable=False)
    aspect_ratio = Column(String(10), default="1:1", nullable=False)
    style_preference = Column(String(20), default="bold", nullable=False)
    reference_image_url = Column(Text, nullable=True)

    # Output
    result_url = Column(Text, nullable=True)
    file_size = Column(BigInteger, nullable=False, default=0)
    seed = Column(String(50), nullable=True)
    parsed_headline = Column(Text, nullable=True)
    parsed_sub_headline = Column(Text, nullable=True)
    parsed_cta = Column(Text, nullable=True)
    visual_prompt = Column(Text, nullable=True)
    quantum_layout = Column(Text, nullable=True)
    variation_results = Column(Text, nullable=True)

    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
