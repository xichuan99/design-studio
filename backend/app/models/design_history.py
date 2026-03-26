from sqlalchemy import Column, String, JSON, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class DesignHistory(Base):
    __tablename__ = "design_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    background_url = Column(String, nullable=False)
    text_layers = Column(JSON, nullable=False)
    generation_params = Column(JSON, nullable=True)
    canvas_schema_version = Column(
        Integer, nullable=False, default=1, server_default="1"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project")
