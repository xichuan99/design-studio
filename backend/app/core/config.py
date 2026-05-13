from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    REQUIRE_PRODUCTION_SECRETS: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dev:devpass@localhost:5433/designstudio"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    NEXTAUTH_SECRET: str = ""

    # LLM
    OPENROUTER_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    QUANTUM_LAYOUT_ENABLED: bool = True
    LLM_MAX_CONCURRENT_PER_MODEL: int = 5

    # Email
    RESEND_API_KEY: str = ""
    WAITLIST_EMAIL_FROM: str = "SmartDesign <system@nugrohopramono.my.id>"
    WAITLIST_LEAD_MAGNET_URL: str = ""

    # Image Generation (Fal.ai)
    FAL_KEY: str = ""
    ADVANCED_RELIGHT_ENABLED: bool = True

    # Cloud Storage (Backblaze B2 — S3-compatible)
    S3_ENDPOINT: str = ""
    S3_BUCKET: str = "designstudio-prod"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_PUBLIC_URL: str = ""  # Public CDN/URL prefix for accessing stored files

    # Backend public base URL (used for local-storage fallback URLs)
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # Storage paid upgrade
    STORAGE_WEBHOOK_SECRET: str = ""
    STORAGE_CHECKOUT_URL_BASE: str = ""
    STORAGE_ADDON_CATALOG_JSON: str = ""

    # Credit pack payment
    CREDIT_CHECKOUT_URL_BASE: str = ""
    CREDIT_PACK_CATALOG_JSON: str = ""

    # Midtrans payment provider
    MIDTRANS_SERVER_KEY: str = ""
    MIDTRANS_IS_PRODUCTION: bool = False

    # Feature flag: enable paid storage upgrade flow
    STORAGE_PAYMENT_ENABLED: bool = True

    # Feature flag: enable paid credit-pack flow
    CREDIT_PAYMENT_ENABLED: bool = True

    # Feature flag: enable beta allowlist gating for signups
    BETA_GATING_ENABLED: bool = False

    # Optional extra CA bundle for internal HTTPS assets/services.
    INTERNAL_CA_BUNDLE_PATH: str = ""
    INTERNAL_METRICS_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()


def missing_required_runtime_settings(config: Settings = settings) -> list[str]:
    """Return required settings missing for staging/production runtime."""
    environment = (config.ENVIRONMENT or "").strip().lower()
    strict_runtime = config.REQUIRE_PRODUCTION_SECRETS or environment in {
        "production",
        "staging",
    }
    if not strict_runtime:
        return []

    required = {
        "DATABASE_URL": config.DATABASE_URL,
        "REDIS_URL": config.REDIS_URL,
        "NEXTAUTH_SECRET": config.NEXTAUTH_SECRET,
        "FAL_KEY": config.FAL_KEY,
        "OPENROUTER_API_KEY": config.OPENROUTER_API_KEY,
        "S3_ENDPOINT": config.S3_ENDPOINT,
        "S3_BUCKET": config.S3_BUCKET,
        "S3_ACCESS_KEY": config.S3_ACCESS_KEY,
        "S3_SECRET_KEY": config.S3_SECRET_KEY,
        "S3_PUBLIC_URL": config.S3_PUBLIC_URL,
        "INTERNAL_METRICS_TOKEN": config.INTERNAL_METRICS_TOKEN,
    }
    if config.STORAGE_PAYMENT_ENABLED or config.CREDIT_PAYMENT_ENABLED:
        required.update(
            {
                "MIDTRANS_SERVER_KEY": config.MIDTRANS_SERVER_KEY,
            }
        )

    if config.STORAGE_PAYMENT_ENABLED:
        required.update(
            {
                "STORAGE_WEBHOOK_SECRET": config.STORAGE_WEBHOOK_SECRET,
                "STORAGE_CHECKOUT_URL_BASE": config.STORAGE_CHECKOUT_URL_BASE,
            }
        )

    return [name for name, value in required.items() if not str(value or "").strip()]


def validate_required_runtime_settings(config: Settings = settings) -> None:
    missing = missing_required_runtime_settings(config)
    if missing:
        raise RuntimeError(
            "Missing required runtime settings for staging/production: "
            + ", ".join(sorted(missing))
        )
