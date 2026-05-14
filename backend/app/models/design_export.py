"""Design export event model for backend-owned export tracking.

Decouples export measurement from user feedback submission. Every export
attempt is logged to this table, enabling reliable generation_to_export
and export_to_payment funnel metrics.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DesignExport(Base):
    """Tracks every design export attempt."""

    __tablename__ = "design_exports"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    design_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("ai_tool_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Export format/target
    export_format: Mapped[str] = mapped_column(String(50), nullable=False)  # png, jpg, pdf, etc.
    target_platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # shopee, tokopedia, etc.

    # Success/failure tracking
    success: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<DesignExport id={self.id} user_id={self.user_id} "
            f"design_id={self.design_id} success={self.success}>"
        )
