import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ad_prompt_builder import build_ad_concepts


@pytest.mark.asyncio
async def test_build_ad_concepts_accepts_fenced_json_response():
    response_payload = {
        "concepts": [
            {
                "id": "studio_minimalis",
                "concept_name": "Studio Minimalis",
                "visual_prompt": "clean studio scene with copy space for product placement",
                "headline": "Promo Baru",
                "tagline": "Tampil rapi setiap hari",
                "call_to_action": "Beli Sekarang",
            }
        ]
    }

    with patch(
        "asyncio.to_thread",
        new=AsyncMock(return_value=f"```json\n{json.dumps(response_payload)}\n```\ncatatan"),
    ):
        result = await build_ad_concepts(b"fake-image", "image/png")

    assert result["concepts"][0]["id"] == "studio_minimalis"
    assert result["concepts"][0]["headline"] == "Promo Baru"