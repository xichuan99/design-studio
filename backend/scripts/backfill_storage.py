import asyncio
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import httpx

from app.models.user import User
from app.models.job import Job
from app.models.brand_kit import BrandKit
from app.services.storage_quota_service import estimate_file_size


async def backfill_storage():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    try:
        engine = create_async_engine(database_url)
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    async with AsyncSessionLocal() as session:
        # Get all users
        result = await session.execute(select(User))
        users = result.scalars().all()

        async with httpx.AsyncClient(timeout=10.0):
            for user in users:
                print(f"Processing user: {user.email} ({user.id})")
                total_size = 0

                # 1. Sum up sizes of generation jobs (result_url)
                # Job table is used for AI generation jobs
                stmt = select(Job).where(
                    Job.user_id == user.id, Job.result_url.isnot(None)
                )
                jobs_result = await session.execute(stmt)
                jobs = jobs_result.scalars().all()

                for job in jobs:
                    if job.result_url:
                        size = await estimate_file_size(job.result_url)
                        print(f"  - Job {job.id}: {size} bytes")
                        total_size += size

                # 2. Sum up sizes of Brand Kit logos
                stmt = select(BrandKit).where(
                    BrandKit.user_id == user.id, BrandKit.logo_url.isnot(None)
                )
                brand_kits_result = await session.execute(stmt)
                brand_kits = brand_kits_result.scalars().all()

                for kit in brand_kits:
                    if kit.logo_url:
                        size = await estimate_file_size(kit.logo_url)
                        print(f"  - Brand Kit {kit.id} logo: {size} bytes")
                        total_size += size

                print(f"Total calculated size for {user.email}: {total_size} bytes")

                # Update user storage
                user.storage_used = total_size
                await session.commit()
                print(f"Updated {user.email} storage_used to {total_size} bytes\n")


if __name__ == "__main__":
    asyncio.run(backfill_storage())
