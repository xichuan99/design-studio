from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Quantum Layout Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/quantum"
    LOG_LEVEL: str = "INFO"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
