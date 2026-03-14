import asyncio
from app.models.brand_kit import BrandKit
from app.schemas.brand_kit import BrandKitCreate, ColorSwatch
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

async def test():
    try:
        data = {
            "name": "Test Brand Kit",
            "logo_url": None,
            "colors": [
                {"hex": "#FF0000", "name": "Merah", "role": "primary"}
            ]
        }
        validated = BrandKitCreate(**data)
        print("Pydantic validation passed:", validated.model_dump())
    except Exception as e:
        print("Pydantic error:", e)

if __name__ == "__main__":
    asyncio.run(test())
