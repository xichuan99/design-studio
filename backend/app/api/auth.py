from app.core.exceptions import AppException, NotFoundError, ValidationError, InsufficientCreditsError, UnauthorizedError, ForbiddenError, ConflictError, InternalServerError
from app.schemas.error import ERROR_RESPONSES
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.schemas.error import ERROR_RESPONSES

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
    Otherwise, creates the user, hashes the password, and logs 10 bonus credits for signing up.
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValidationError(detail="Email is already registered",
        )

    # Create new user
    hashed_password = get_password_hash(data.password)
    user = User(
        email=data.email,
        name=data.name,
        password_hash=hashed_password,
        provider="credentials",
    )

    db.add(user)

    # Needs a flush to get the user ID
    await db.flush()

    from app.services.credit_service import log_credit_change

    await log_credit_change(db, user, 10, "Bonus pendaftaran")

    await db.commit()
    await db.refresh(user)

    return user


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
        raise UnauthorizedError(detail="Invalid email or password"
        )

    if not user.password_hash:
        raise UnauthorizedError(detail="This account uses Google Login. Please sign in with Google.",
        )

    if not verify_password(data.password, user.password_hash):
        raise UnauthorizedError(detail="Invalid email or password"
        )

    return user
