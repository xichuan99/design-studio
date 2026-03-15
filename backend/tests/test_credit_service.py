import pytest
from unittest.mock import MagicMock, AsyncMock

from app.services.credit_service import log_credit_change
from app.models.user import User
from app.models.credit_transaction import CreditTransaction

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def test_user():
    return User(id="user_123", credits_remaining=10)

@pytest.mark.asyncio
async def test_log_credit_change_addition(mock_db, test_user):
    await log_credit_change(mock_db, test_user, 5, "Added credits")

    assert test_user.credits_remaining == 15

    # We expect db.add to be called twice: once for user, once for transaction
    assert mock_db.add.call_count == 2

    # Check the args passed to db.add
    added_objects = [call.args[0] for call in mock_db.add.call_args_list]

    user_obj = next(obj for obj in added_objects if isinstance(obj, User))
    assert user_obj.credits_remaining == 15

    transaction_obj = next(obj for obj in added_objects if isinstance(obj, CreditTransaction))
    assert transaction_obj.user_id == "user_123"
    assert transaction_obj.amount == 5
    assert transaction_obj.balance_after == 15
    assert transaction_obj.description == "Added credits"

@pytest.mark.asyncio
async def test_log_credit_change_deduction(mock_db, test_user):
    await log_credit_change(mock_db, test_user, -3, "Used service")

    assert test_user.credits_remaining == 7
    assert mock_db.add.call_count == 2

    added_objects = [call.args[0] for call in mock_db.add.call_args_list]
    transaction_obj = next(obj for obj in added_objects if isinstance(obj, CreditTransaction))

    assert transaction_obj.amount == -3
    assert transaction_obj.balance_after == 7

@pytest.mark.asyncio
async def test_log_credit_change_zero(mock_db, test_user):
    await log_credit_change(mock_db, test_user, 0, "No change")

    assert test_user.credits_remaining == 10
    assert mock_db.add.call_count == 0

@pytest.mark.asyncio
async def test_log_credit_change_exception(mock_db, test_user):
    mock_db.add.side_effect = Exception("Database error")

    with pytest.raises(Exception, match="Database error"):
        await log_credit_change(mock_db, test_user, 5, "Added credits")
