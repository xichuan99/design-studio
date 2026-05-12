from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.designs_routers.jobs import (
    ExportFeedbackRequest,
    create_export_feedback,
)
from app.core.exceptions import NotFoundError


@pytest.mark.asyncio
async def test_create_export_feedback_records_design_signal():
    user_id = uuid4()
    design_id = uuid4()
    created_feedback = []

    db = MagicMock()
    db.add.side_effect = created_feedback.append
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    query_result = MagicMock()
    query_result.scalar_one_or_none.return_value = design_id
    db.execute = AsyncMock(return_value=query_result)

    response = await create_export_feedback(
        request=ExportFeedbackRequest(
            design_id=str(design_id),
            rating=5,
            helpful=True,
            note="Siap upload.",
            export_format="PNG",
        ),
        db=db,
        current_user=SimpleNamespace(id=user_id),
    )

    assert response["status"] == "recorded"
    assert created_feedback
    feedback = created_feedback[0]
    assert feedback.user_id == user_id
    assert feedback.design_id == design_id
    assert feedback.rating == 5
    assert feedback.helpful is True
    assert feedback.note == "Siap upload."
    assert feedback.export_format == "png"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(feedback)


@pytest.mark.asyncio
async def test_create_export_feedback_rejects_foreign_design():
    db = MagicMock()
    query_result = MagicMock()
    query_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=query_result)

    with pytest.raises(NotFoundError):
        await create_export_feedback(
            request=ExportFeedbackRequest(design_id=str(uuid4()), rating=4),
            db=db,
            current_user=SimpleNamespace(id=uuid4()),
        )
