import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.models.brand_kit import BrandKit

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/design_studio"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with async_session() as session:
        # Just describe the brand_kits table
        result = await session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'brand_kits';
        """))
        for row in result:
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check())
