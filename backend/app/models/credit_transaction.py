import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Ensure the back-reference exists implicitly or explicitly on User
    user = relationship("User", backref="credit_transactions")
