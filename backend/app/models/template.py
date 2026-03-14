from sqlalchemy import Column, String, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    aspect_ratio = Column(String, nullable=False)
    style = Column(String, nullable=False)
    default_text_layers = Column(JSON, nullable=False)
    prompt_suffix = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
