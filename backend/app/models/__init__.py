# Import all models here so that Alembic can detect them when importing Base from models
from app.core.database import Base
from app.models.user import User
from app.models.project import Project
from app.models.template import Template
from app.models.design_history import DesignHistory
from app.models.job import Job
