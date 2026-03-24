from sqlalchemy import Column, String, Integer, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

STORAGE_QUOTA_FREE = 104857600  # 100 MB in bytes


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    provider = Column(String, nullable=False, default="google")
    password_hash = Column(String, nullable=True)
    from app.core.credit_costs import DEFAULT_CREDITS

    credits_remaining = Column(Integer, nullable=False, default=DEFAULT_CREDITS)
    storage_used = Column(BigInteger, nullable=False, default=0)
    storage_quota = Column(BigInteger, nullable=False, default=STORAGE_QUOTA_FREE)

    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
