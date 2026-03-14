import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import update
from app.models.brand_kit import BrandKit
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/design_studio"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with async_session() as session:
        # Get users
        res = await session.execute(select(User).limit(1))
        user = res.scalar_one_or_none()
        if not user:
            print("No users found")
            return
            
        print(f"Testing for user {user.id}")
        
        # Test update statement execution
        try:
            await session.execute(
                update(BrandKit)
                .where(BrandKit.user_id == user.id)
                .values(is_active=False)
            )
            print("Update executed successfully")
            
            # Test insert
            new_kit = BrandKit(
                user_id=user.id,
                name="Test API Kit",
                logo_url=None,
                colors=[{"hex": "#000", "name": "Black", "role": "primary"}],
                is_active=True
            )
            session.add(new_kit)
            await session.commit()
            print("Insert executed successfully")
        except Exception as e:
            print("Error during DB operations:", e)

if __name__ == "__main__":
    asyncio.run(check())
