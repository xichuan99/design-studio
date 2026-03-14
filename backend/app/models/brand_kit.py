from sqlalchemy import Column, String, JSON, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class BrandKit(Base):
    __tablename__ = "brand_kits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False, default="Brand Kit Saya")
    logo_url = Column(
        String, nullable=True
    )  # Keep for backward compatibility/single logo fallback
    logos = Column(JSON, nullable=True, default=[])  # Stored as JSON list of strings
    # Stored as JSON list of hex strings: ["#FF0000", "#00FF00"]
    colors = Column(JSON, nullable=False)
    typography = Column(
        JSON, nullable=True
    )  # Stored as JSON dict: {"primaryFont": "...", "secondaryFont": "..."}
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User")
