"""Service for managing user credits and logging transactions."""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.credit_transaction import CreditTransaction

logger = logging.getLogger(__name__)


async def log_credit_change(
    db: AsyncSession, user: User, amount: int, description: str
):
    """
    Modifies the user's credits_remaining and logs a CreditTransaction.
    Note: The caller is responsible for eventually calling db.commit().

    Args:
        db (AsyncSession): The database session.
        user (User): The user model instance whose credits are being changed.
        amount (int): The amount of credits to add (positive) or deduct (negative).
        description (str): A description of the transaction.

    Raises:
        Exception: If updating the user's balance or creating the transaction record fails.
    """
    try:
        if amount == 0:
            return  # No change to log

        # Update the user's balance
        user.credits_remaining += amount
        db.add(user)

        # Create the transaction record
        transaction = CreditTransaction(
            user_id=user.id,
            amount=amount,
            balance_after=user.credits_remaining,
            description=description,
        )
        db.add(transaction)

    except Exception as e:
        logger.exception(f"Failed to log credit change for user {user.id}")
        # We raise here because failing to log a credit transaction (especially a deduction)
        # might leave the system in an inconsistent state.
        raise e
