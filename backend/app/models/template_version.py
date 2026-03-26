import uuid
from sqlalchemy import Column, Integer, JSON, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TemplateVersion(Base):
    __tablename__ = "template_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("template_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False, default=1)
    canvas_state = Column(JSON, nullable=False)
    default_text_layers = Column(JSON, nullable=False, default=[])
    thumbnail_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    template_submission = relationship("TemplateSubmission")
