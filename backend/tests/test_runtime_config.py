import pytest

from app.core.config import Settings, missing_required_runtime_settings, validate_required_runtime_settings


def test_runtime_settings_are_not_required_in_development():
    config = Settings(ENVIRONMENT="development", STORAGE_PAYMENT_ENABLED=True)

    assert missing_required_runtime_settings(config) == []


def test_runtime_settings_fail_loudly_for_production():
    config = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql+asyncpg://db",
        REDIS_URL="redis://redis",
        NEXTAUTH_SECRET="secret",
        FAL_KEY="fal",
        OPENROUTER_API_KEY="openrouter",
        S3_ENDPOINT="https://s3.example.com",
        S3_BUCKET="bucket",
        S3_ACCESS_KEY="access",
        S3_SECRET_KEY="secret",
        S3_PUBLIC_URL="https://cdn.example.com",
        INTERNAL_METRICS_TOKEN="internal",
        STORAGE_PAYMENT_ENABLED=True,
    )

    missing = missing_required_runtime_settings(config)

    assert "MIDTRANS_SERVER_KEY" in missing
    assert "STORAGE_WEBHOOK_SECRET" in missing
    assert "STORAGE_CHECKOUT_URL_BASE" in missing
    with pytest.raises(RuntimeError, match="MIDTRANS_SERVER_KEY"):
        validate_required_runtime_settings(config)
