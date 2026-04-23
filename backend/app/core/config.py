from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dev:devpass@localhost:5433/designstudio"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    NEXTAUTH_SECRET: str = ""

    # LLM
    OPENROUTER_API_KEY: str = ""

    # Email
    RESEND_API_KEY: str = ""

    # Image Generation (Fal.ai)
    FAL_KEY: str = ""

    # Cloud Storage (Backblaze B2 — S3-compatible)
    S3_ENDPOINT: str = ""
    S3_BUCKET: str = "designstudio-prod"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_PUBLIC_URL: str = ""  # Public CDN/URL prefix for accessing stored files

    # Backend public base URL (used for local-storage fallback URLs)
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # Optional extra CA bundle for internal HTTPS assets/services.
    INTERNAL_CA_BUNDLE_PATH: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
