import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.core.exceptions import AppException
from app.models.user import User
from app.services.storage_quota_service import (
    HTTP_413_TOO_LARGE,
    estimate_file_size,
    get_storage_stats,
    check_quota,
    increment_usage,
    decrement_usage,
    recalculate_storage,
)


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def test_user():
    return User(id="user_123", storage_used=1024 * 1024, storage_quota=5 * 1024 * 1024)


@pytest.mark.asyncio
async def test_estimate_file_size_success():
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.headers = {"content-length": "2048"}

        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.head.return_value = mock_response

        size = await estimate_file_size("http://example.com/file.jpg")
        assert size == 2048


@pytest.mark.asyncio
async def test_estimate_file_size_empty_url():
    size = await estimate_file_size("")
    assert size == 0


@pytest.mark.asyncio
async def test_estimate_file_size_failure():
    with patch("httpx.AsyncClient") as mock_client:
        mock_client_instance = mock_client.return_value.__aenter__.return_value
        mock_client_instance.head.side_effect = Exception("Timeout")

        size = await estimate_file_size("http://example.com/error.jpg")
        assert size == 0


@pytest.mark.asyncio
async def test_get_storage_stats_success(mock_db, test_user):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    stats = await get_storage_stats("user_123", mock_db)

    assert stats["used"] == 1048576
    assert stats["quota"] == 5242880
    assert stats["percentage"] == 20.0
    assert stats["used_mb"] == 1.0
    assert stats["quota_mb"] == 5.0


@pytest.mark.asyncio
async def test_get_storage_stats_not_found(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(AppException) as exc_info:
        await get_storage_stats("user_123", mock_db)
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


@pytest.mark.asyncio
async def test_check_quota_success(mock_db, test_user):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    await check_quota("user_123", 1024 * 1024, mock_db)
    # The test passes if no exception is raised


@pytest.mark.asyncio
async def test_check_quota_exceeded(mock_db, test_user):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    with pytest.raises(AppException) as exc_info:
        await check_quota("user_123", 5 * 1024 * 1024, mock_db)
    assert exc_info.value.status_code == HTTP_413_TOO_LARGE
    assert "Storage penuh" in exc_info.value.detail


@pytest.mark.asyncio
async def test_check_quota_not_found(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    with pytest.raises(AppException) as exc_info:
        await check_quota("user_123", 100, mock_db)
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "User not found"


@pytest.mark.asyncio
async def test_increment_usage(mock_db):
    await increment_usage("user_123", 500, mock_db)
    assert mock_db.execute.call_count == 1
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_decrement_usage_success(mock_db, test_user):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    await decrement_usage("user_123", 500, mock_db)

    assert mock_db.execute.call_count == 2
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_decrement_usage_floor_at_zero(mock_db, test_user):
    test_user.storage_used = 100
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    await decrement_usage("user_123", 500, mock_db)

    assert mock_db.execute.call_count == 2
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_decrement_usage_not_found(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result

    await decrement_usage("user_123", 500, mock_db)

    assert mock_db.execute.call_count == 1
    assert mock_db.commit.call_count == 0


@pytest.mark.asyncio
async def test_recalculate_storage_includes_brand_kit_logos(mock_db):
    ai_sum_result = MagicMock()
    ai_sum_result.scalar.return_value = 1024

    job_sum_result = MagicMock()
    job_sum_result.scalar.return_value = 2048

    brand_kit = MagicMock()
    brand_kit.logo_url = "https://cdn.example.com/kit-logo-1.png"
    brand_kit.logos = [
        "https://cdn.example.com/kit-logo-2.png",
        "https://cdn.example.com/kit-logo-3.png",
    ]

    kits_result = MagicMock()
    kits_result.scalars.return_value.all.return_value = [brand_kit]

    mock_db.execute.side_effect = [
        ai_sum_result,
        job_sum_result,
        kits_result,
        MagicMock(),
    ]

    with patch(
        "app.services.storage_quota_service.estimate_file_size",
        new=AsyncMock(side_effect=[100, 200, 0]),
    ):
        total = await recalculate_storage("user_123", mock_db)

    assert total == 1024 + 2048 + 300
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_recalculate_storage_with_orphaned_jobs(mock_db):
    """Test that orphaned jobs (project_id=NULL) are still counted in storage."""
    ai_sum_result = MagicMock()
    ai_sum_result.scalar.return_value = 5 * 1024 * 1024  # 5 MB from AiToolResult

    job_sum_result = MagicMock()
    job_sum_result.scalar.return_value = 3 * 1024 * 1024  # 3 MB from Job (including orphans)

    kits_result = MagicMock()
    kits_result.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [ai_sum_result, job_sum_result, kits_result, MagicMock()]

    total = await recalculate_storage("user_123", mock_db)

    # Total should be 5 + 3 = 8 MB
    assert total == 8 * 1024 * 1024
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_recalculate_storage_zero_files(mock_db):
    """Test reconciliation when user has no files."""
    ai_sum_result = MagicMock()
    ai_sum_result.scalar.return_value = 0

    job_sum_result = MagicMock()
    job_sum_result.scalar.return_value = 0

    kits_result = MagicMock()
    kits_result.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [ai_sum_result, job_sum_result, kits_result, MagicMock()]

    total = await recalculate_storage("user_123", mock_db)

    assert total == 0
    assert mock_db.commit.call_count == 1


@pytest.mark.asyncio
async def test_decrement_usage_after_project_deletion(mock_db, test_user):
    """Test that decrement_usage is called correctly after project deletion."""
    test_user.storage_used = 10 * 1024 * 1024  # Start at 10 MB
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_user
    mock_db.execute.return_value = mock_result

    # Decrement by 5 MB
    await decrement_usage("user_123", 5 * 1024 * 1024, mock_db)

    assert mock_db.commit.call_count == 1
