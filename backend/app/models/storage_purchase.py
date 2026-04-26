import uuid

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StoragePurchase(Base):
    __tablename__ = "storage_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    addon_code = Column(String, nullable=False, index=True)
    bytes_added = Column(BigInteger, nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="IDR")
    provider = Column(String, nullable=False, default="manual")
    provider_txn_id = Column(String, nullable=True, unique=True)
    status = Column(String, nullable=False, default="pending", index=True)
    paid_event_id = Column(String, nullable=True, unique=True)
    checkout_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="storage_purchases")
