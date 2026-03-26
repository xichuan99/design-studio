import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TemplateReview(Base):
    __tablename__ = "template_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_submission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("template_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    decision = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    template_submission = relationship("TemplateSubmission")
    reviewer = relationship("User")
