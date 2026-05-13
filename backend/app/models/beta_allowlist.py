"""Beta allowlist model for controlling beta signup access via email or invite codes."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Text, Index
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class BetaAllowlist(Base):
    """
    Beta allowlist entry: allows specific emails or invite codes to sign up during closed beta.
    - entry_type: 'email' or 'code'
    - entry_value: the email or invite code
    - status: 'active' or 'inactive' (soft-disable without deleting)
    - created_by: operator email who created this entry
    - notes: optional admin notes (e.g., "Early supporter", "Partner")
    """

    __tablename__ = "beta_allowlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_type = Column(String(16), nullable=False, index=True)  # 'email' or 'code'
    entry_value = Column(String(255), nullable=False, index=True)  # normalized email or code
    status = Column(String(16), nullable=False, default="active", index=True)  # 'active' or 'inactive'
    beta_cohort = Column(String(50), nullable=True, index=True)  # e.g., 'wave_1', 'partner_beta', etc.
    initial_credits_grant = Column(Integer, nullable=False, default=0)  # extra credits for beta user
    used_count = Column(Integer, nullable=False, default=0)  # how many times this allowlist entry was used for signup
    last_used_at = Column(DateTime(timezone=True), nullable=True)  # last signup via this entry
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(255), nullable=True)  # operator email or 'system'
    notes = Column(Text, nullable=True)

    # Composite index for fast lookup: (entry_type, entry_value, status)
    __table_args__ = (
        Index("ix_beta_allowlist_lookup", "entry_type", "entry_value", "status"),
    )
