import asyncio

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://dev:devpass@localhost:5433/designstudio"


async def main():
    try:
        engine = create_async_engine(DATABASE_URL)
        async with engine.begin() as conn:
            result = await conn.execute(
                text("SELECT email, provider FROM users LIMIT 10;")
            )
            for row in result:
                print(f"{row[0]} ({row[1]})")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
