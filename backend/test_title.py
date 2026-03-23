import asyncio
import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.llm_design_service import generate_project_title

@pytest.mark.asyncio
async def test_title():
    prompt = "Buatkan Saya Desain Untuk Program diskon akhir tahun promo 12.12"
    title = await generate_project_title(prompt)

    assert isinstance(title, str)
    assert title.strip()
    assert len(title) <= 80

if __name__ == "__main__":
    asyncio.run(test_title())
