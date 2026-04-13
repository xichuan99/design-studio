from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.api.brand_kits import create_brand_kit
from app.schemas.brand_kit import BrandKitCreate


@pytest.mark.asyncio
async def test_create_brand_kit_without_folder_id_uses_none() -> None:
    brand_kit_in = BrandKitCreate(
        name="Kit Utama",
        logo_url="https://example.com/logo.png",
        logos=["https://example.com/logo.png"],
        colors=[{"hex": "#000000", "name": "Hitam", "role": "text"}],
    )
    current_user = SimpleNamespace(id=uuid4())

    scalars_result = MagicMock()
    scalars_result.all.return_value = []
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_result

    db = AsyncMock()
    db.execute.return_value = execute_result
    db.add = MagicMock()

    async def refresh_side_effect(brand_kit):
        brand_kit.id = uuid4()
        brand_kit.user_id = current_user.id

    db.refresh.side_effect = refresh_side_effect

    result = await create_brand_kit(brand_kit_in=brand_kit_in, current_user=current_user, db=db)

    saved_brand_kit = db.add.call_args.args[0]
    assert saved_brand_kit.folder_id is None
    assert result.folder_id is None