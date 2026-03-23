import uuid
from sqlalchemy import Column, String, JSON, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TemplateSubmission(Base):
    __tablename__ = "template_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    source_project_id = Column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    aspect_ratio = Column(String, nullable=False, default="1:1")
    status = Column(String, nullable=False, default="draft")

    preview_canvas_state = Column(JSON, nullable=False)
    default_text_layers = Column(JSON, nullable=False, default=[])
    thumbnail_url = Column(String, nullable=True)
    prompt_suffix = Column(String, nullable=True)

    is_featured = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner = relationship("User")
    source_project = relationship("Project")
