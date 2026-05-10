from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.testimonials import submit_testimonial
from app.models import testimonial as testimonial_models
from app.schemas import testimonial as testimonial_schemas


def _execute_result(existing: testimonial_models.Testimonial | None) -> MagicMock:
    result = MagicMock()
    result.scalar_one_or_none.return_value = existing
    return result


@pytest.mark.asyncio
async def test_submit_testimonial_updates_existing_pending_submission() -> None:
    existing = testimonial_models.Testimonial(
        id=uuid4(),
        user_id=uuid4(),
        name="Nama Lama",
        role="Role Lama",
        quote="Quote lama yang cukup panjang.",
        status="pending",
        reviewer_notes="Perlu dirapikan",
        reviewed_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    user = MagicMock()
    user.id = existing.user_id

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_execute_result(existing))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    payload = testimonial_schemas.TestimonialCreateRequest(
        name="Nama Baru",
        role="Founder",
        quote="Testimoni baru yang lebih jelas dan sudah memenuhi batas minimum.",
    )

    response = await submit_testimonial(payload=payload, current_user=user, db=db)

    assert response.is_update is True
    assert response.message == "Perubahan testimoni berhasil disimpan dan menunggu review."
    assert existing.name == "Nama Baru"
    assert existing.role == "Founder"
    assert existing.quote == "Testimoni baru yang lebih jelas dan sudah memenuhi batas minimum."
    assert existing.status == "pending"
    assert existing.reviewed_at is None
    assert existing.reviewer_notes is None
    db.add.assert_not_called()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(existing)


@pytest.mark.asyncio
async def test_submit_testimonial_creates_new_pending_submission_after_approved_review() -> None:
    existing = testimonial_models.Testimonial(
        id=uuid4(),
        user_id=uuid4(),
        name="Nama Lama",
        role="Role Lama",
        quote="Quote lama yang cukup panjang.",
        status="approved",
        reviewer_notes="Sudah oke",
        reviewed_at=datetime(2026, 5, 2, tzinfo=timezone.utc),
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
    )
    user = MagicMock()
    user.id = existing.user_id

    captured: dict[str, testimonial_models.Testimonial] = {}

    def capture_add(item: testimonial_models.Testimonial) -> None:
        captured["item"] = item

    async def refresh_item(item: testimonial_models.Testimonial) -> None:
        item.id = item.id or uuid4()
        item.created_at = item.created_at or datetime(2026, 5, 10, tzinfo=timezone.utc)

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_execute_result(existing))
    db.add = MagicMock(side_effect=capture_add)
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=refresh_item)

    payload = testimonial_schemas.TestimonialCreateRequest(
        name="Nama Revisi",
        role="Owner",
        quote="Versi testimoni baru ini dikirim ulang setelah submission lama sudah dimoderasi.",
    )

    response = await submit_testimonial(payload=payload, current_user=user, db=db)

    new_item = captured["item"]
    assert new_item is not existing
    assert new_item.user_id == existing.user_id
    assert new_item.status == "pending"
    assert new_item.name == "Nama Revisi"
    assert new_item.role == "Owner"
    assert new_item.quote == "Versi testimoni baru ini dikirim ulang setelah submission lama sudah dimoderasi."
    assert response.is_update is False
    assert response.message == "Testimoni berhasil dikirim dan menunggu review."
    assert response.item.status == "pending"
    assert existing.status == "approved"
    assert existing.reviewed_at == datetime(2026, 5, 2, tzinfo=timezone.utc)
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(new_item)
