import uuid
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TemplateUsageStat(Base):
    __tablename__ = "template_usage_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("template_submissions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    uses_count = Column(Integer, nullable=False, default=0)
    duplicate_count = Column(Integer, nullable=False, default=0)
    favorite_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    template_submission = relationship("TemplateSubmission")
