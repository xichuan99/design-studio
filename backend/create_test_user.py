import asyncio
import sys

sys.path.append("/Users/nugroho/Documents/design-studio/backend")
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash

DATABASE_URL = "postgresql+asyncpg://dev:devpass@localhost:5433/designstudio"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # check if it exists
        result = await session.execute(select(User).where(User.email == "demo@example.com"))
        user = result.scalar_one_or_none()

        if not user:
            print("Creating test user demo@example.com...")
            hashed_pw = get_password_hash("password123")
            user = User(
                email="demo@example.com",
                name="Demo User",
                password_hash=hashed_pw,
                provider="credentials"
            )
            session.add(user)
            await session.commit()
            print("Test user created!")
        else:
            print("Test user demo@example.com already exists.")

if __name__ == "__main__":
    asyncio.run(main())
