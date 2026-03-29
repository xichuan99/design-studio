import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class BrandMemory(Base):
    __tablename__ = "brand_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_kit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("brand_kits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Store the actual text chunk or brand rule
    content = Column(Text, nullable=False)

    # Optional metadata (document name, page number, rule category like 'typography' or 'colors')
    metadata_json = Column(String, nullable=True)

    # Store the embedding vector, assuming a standard model size, e.g., 768 for gemini text embeddings
    embedding = Column(Vector(768), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    brand_kit = relationship("BrandKit", back_populates="memories")
