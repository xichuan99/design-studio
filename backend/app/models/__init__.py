# Import all models here so that Alembic can detect them when importing Base from models
from app.core.database import Base as Base
from app.models.user import User as User
from app.models.project import Project as Project
from app.models.template import Template as Template
from app.models.design_history import DesignHistory as DesignHistory
from app.models.brand_kit import BrandKit as BrandKit
from app.models.job import Job as Job
