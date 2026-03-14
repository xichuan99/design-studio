import asyncio
from app.core.database import AsyncSessionLocal
from app.models.template import Template
from sqlalchemy.future import select


async def clean():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Template))
        templates = result.scalars().all()
        for t in templates:
            await session.delete(t)
        await session.commit()
        print(f"🗑️  Deleted {len(templates)} old templates!")


if __name__ == "__main__":
    asyncio.run(clean())
