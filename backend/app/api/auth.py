from app.core.exceptions import ValidationError, UnauthorizedError
from app.schemas.error import ERROR_RESPONSES
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import secrets
from datetime import datetime, timedelta, timezone
import logging
import os

from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, RefreshTokenRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.models.waitlist_entry import WaitlistEntry

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Creates a new user account with email and password and grants initial sign-up credits.",
    responses=ERROR_RESPONSES,
)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Registers a new user with email and password.
    If the email already exists, returns a 400 error.
    Otherwise, creates the user, hashes the password, and logs bonus credits for signing up.

    If beta gating is enabled:
    - User email must be on the allowlist, OR
    - User must provide a valid invite code
    """
    from app.core.config import settings
    from app.services.beta_allowlist_service import (
        check_email_allowed,
        check_invite_code_allowed,
        mark_allowlist_entry_used,
    )

    # Check if user already exists
    normalized_email = data.email.strip().lower()
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValidationError(
            detail="Email is already registered",
        )

    # Check beta gating
    allowlist_entry = None
    invite_source = "credentials"  # default invite source
    extra_credits = 0

    if settings.BETA_GATING_ENABLED:
        email_allowed, email_entry = await check_email_allowed(normalized_email, db)
        code_allowed = False
        code_entry = None

        if data.invite_code:
            code_allowed, code_entry = await check_invite_code_allowed(data.invite_code, db)

        if not email_allowed and not code_allowed:
            raise ValidationError(
                detail="Email or invite code is not on the beta allowlist. Please check your invitation.",
            )

        # Determine which allowlist entry was used
        if email_allowed:
            allowlist_entry = email_entry
            invite_source = "email_allowlist"
        elif code_allowed:
            allowlist_entry = code_entry
            invite_source = "code_allowlist"

    # Create new user
    hashed_password = get_password_hash(data.password)
    user = User(
        email=normalized_email,
        name=data.name,
        password_hash=hashed_password,
        provider="credentials",
        invite_source=invite_source,
    )

    # Grant extra credits from allowlist if applicable
    if allowlist_entry:
        extra_credits = allowlist_entry.initial_credits_grant

    db.add(user)

    # Needs a flush to get the user ID
    await db.flush()

    from app.services.credit_service import log_credit_change
    from app.core.credit_costs import SIGNUP_BONUS

    # Log signup bonus + any allowlist extra credits
    total_bonus = SIGNUP_BONUS + extra_credits
    await log_credit_change(db, user, total_bonus, f"Bonus pendaftaran ({invite_source})")

    # Mark allowlist entry as used
    if allowlist_entry:
        await mark_allowlist_entry_used(allowlist_entry.id, db)

    waitlist_result = await db.execute(
        select(WaitlistEntry).where(
            func.lower(WaitlistEntry.email) == normalized_email,
            WaitlistEntry.converted_user_id.is_(None),
        )
    )
    waitlist_entry = waitlist_result.scalar_one_or_none()
    if waitlist_entry:
        waitlist_entry.converted_user_id = user.id
        waitlist_entry.converted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "name": user.name})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email, "name": user.name})

    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "credits_remaining": user.credits_remaining,
        "plan_tier": user.plan_tier,
        "access_token": access_token,
        "refresh_token": refresh_token,
    }

    return user_dict


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Verifies user credentials. Primarily used by the frontend NextAuth implementation.",
    responses=ERROR_RESPONSES,
)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies user credentials. Used by frontend NextAuth.
    Returns 401 if the user does not exist, password does not match, or if the account uses Google Login exclusively.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError(detail="Invalid email or password")

    if not user.password_hash:
        raise UnauthorizedError(
            detail="This account uses Google Login. Please sign in with Google.",
        )

    if not verify_password(data.password, user.password_hash):
        raise UnauthorizedError(detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "name": user.name})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email, "name": user.name})

    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "credits_remaining": user.credits_remaining,
        "plan_tier": user.plan_tier,
        "access_token": access_token,
        "refresh_token": refresh_token,
    }

    return user_dict


@router.post(
    "/refresh",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Session Tokens",
    description="Issues a new Access and Refresh token pair using a valid Refresh Token.",
    responses=ERROR_RESPONSES,
)
async def refresh_tokens(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Verifies the provided refresh token and issues a new pair if valid.
    """
    try:
        payload = verify_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError(detail="Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError(detail="Invalid token content")
    except Exception:
        raise UnauthorizedError(detail="Invalid or expired refresh token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError(detail="User not found")

    new_access = create_access_token(data={"sub": str(user.id), "email": user.email, "name": user.name})
    new_refresh = create_refresh_token(data={"sub": str(user.id), "email": user.email, "name": user.name})

    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "credits_remaining": user.credits_remaining,
        "plan_tier": user.plan_tier,
        "access_token": new_access,
        "refresh_token": new_refresh,
    }

    return user_dict


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request a password reset link",
    description="Generates a reset token and sends an email if the account exists.",
)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)

        await db.commit()

        # Send reset email
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        from app.utils.email import send_reset_password_email
        email_sent = await send_reset_password_email(user.email, reset_link)
        if email_sent:
            logger.info(f"[forgot-password] Reset email sent to {user.email} (Provider: {user.provider})")
        else:
            logger.warning(f"[forgot-password] Failed to send reset email to {user.email}. Token was saved but email not delivered.")
    else:
        logger.info(f"[forgot-password] No account found for email: {data.email}")

    # Always return success to prevent email enumeration
    return {"message": "If that email address exists in our system, a password reset link has been sent."}


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset a user's password",
    description="Uses a valid reset token to assign a new password.",
)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.reset_token == data.token))
    user = result.scalar_one_or_none()

    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        raise ValidationError(detail="Invalid or expired reset token")

    hashed_password = get_password_hash(data.new_password)
    user.password_hash = hashed_password
    user.reset_token = None
    user.reset_token_expires = None

    await db.commit()

    return {"message": "Password has been successfully reset."}
