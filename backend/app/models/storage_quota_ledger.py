import uuid

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StorageQuotaLedger(Base):
    __tablename__ = "storage_quota_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    purchase_id = Column(
        UUID(as_uuid=True),
        ForeignKey("storage_purchases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    delta_bytes = Column(BigInteger, nullable=False)
    reason = Column(String, nullable=False)
    source_ref = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="storage_quota_ledger_entries")
    purchase = relationship("StoragePurchase", backref="quota_ledger_entries")
