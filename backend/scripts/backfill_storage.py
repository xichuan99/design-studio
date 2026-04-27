"""
Backfill storage usage for all users.

This script recalculates storage_used for each user by summing:
- All Job.file_size (AI generation results)
- All AiToolResult.file_size (AI tool results)
- Estimated size of BrandKit logos

Usage:
    python -m scripts.backfill_storage [--verbose]

Options:
    --verbose    Print detailed logs for each user
    --limit N    Only process first N users (for testing)
"""

import asyncio
import os
import sys
import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.models.user import User
from app.models.job import Job
from app.models.ai_tool_result import AiToolResult
from app.services.storage_quota_service import recalculate_storage

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def backfill_storage(verbose: bool = False, limit: int = None):
    """
    Recalculate and update storage_used for all users.
    
    Args:
        verbose: If True, print detailed logs per user
        limit: Maximum number of users to process (for testing)
    """
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL not found in .env")
        return False

    try:
        engine = create_async_engine(database_url)
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return False

    async with AsyncSessionLocal() as session:
        # Get all users
        query = select(User)
        if limit:
            query = query.limit(limit)

        result = await session.execute(query)
        users = result.scalars().all()

        if not users:
            logger.warning("No users found in database")
            return False

        logger.info(f"Processing {len(users)} users...")
        fixed_count = 0
        total_reclaimed = 0
        errors = 0

        for idx, user in enumerate(users, 1):
            try:
                old_storage = user.storage_used or 0

                # Recalculate storage for this user
                new_storage = await recalculate_storage(user.id, session)

                if old_storage != new_storage:
                    reclaimed = old_storage - new_storage
                    total_reclaimed += reclaimed
                    fixed_count += 1

                    status = "FIXED" if reclaimed > 0 else "UPDATED"
                    if verbose or reclaimed > 0:
                        logger.info(
                            f"[{idx}/{len(users)}] {user.email}: {status} "
                            f"{old_storage / (1024 * 1024):.2f} MB → "
                            f"{new_storage / (1024 * 1024):.2f} MB "
                            f"(reclaimed: {reclaimed / (1024 * 1024):.2f} MB)"
                        )
                elif verbose:
                    logger.debug(
                        f"[{idx}/{len(users)}] {user.email}: no change ({old_storage / (1024 * 1024):.2f} MB)"
                    )

            except Exception as e:
                errors += 1
                logger.error(
                    f"[{idx}/{len(users)}] Error processing user {user.email} ({user.id}): {e}"
                )
                if verbose:
                    import traceback
                    traceback.print_exc()

        await session.close()

        # Print summary
        logger.info("\n" + "=" * 70)
        logger.info("RECONCILIATION SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total users processed: {len(users)}")
        logger.info(f"Users fixed: {fixed_count}")
        logger.info(f"Errors encountered: {errors}")
        logger.info(f"Total storage reclaimed: {total_reclaimed / (1024 * 1024):.2f} MB")
        logger.info("=" * 70 + "\n")

        return errors == 0


if __name__ == "__main__":
    verbose = "--verbose" in sys.argv
    limit = None

    if "--limit" in sys.argv:
        try:
            idx = sys.argv.index("--limit")
            limit = int(sys.argv[idx + 1])
        except (ValueError, IndexError):
            logger.error("Invalid --limit value")
            sys.exit(1)

    logger.info(
        f"Starting storage backfill reconciliation... "
        f"(verbose={verbose}, limit={limit})"
    )

    success = asyncio.run(backfill_storage(verbose=verbose, limit=limit))
    sys.exit(0 if success else 1)

