import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.llm_design_service import generate_project_title

async def test_title():
    prompt = "Buatkan Saya Desain Untuk Program diskon akhir tahun promo 12.12"
    try:
        title = await generate_project_title(prompt)
        print("SUCCESS:", title)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test_title())
