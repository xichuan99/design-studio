from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    source = Column(String, nullable=False, default="landing")

    delivery_status = Column(String, nullable=False, default="pending")
    lead_magnet_delivered = Column(Boolean, nullable=False, default=False)
    lead_magnet_sent_at = Column(DateTime(timezone=True), nullable=True)
    delivery_error = Column(String, nullable=True)

    converted_user_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    converted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
