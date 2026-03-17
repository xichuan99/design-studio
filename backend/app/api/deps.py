from app.core.exceptions import UnauthorizedError
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Support X-User-Email bypass for dev mode as documented in README
    dev_email = request.headers.get("X-User-Email")

    if not credentials:
        if dev_email:
            email = dev_email
            name = "Dev User"
        else:
            raise UnauthorizedError(
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        try:
            token = credentials.credentials
            payload = verify_token(token)
            email = payload.get("email")
            name = payload.get("name")

            if not email:
                raise UnauthorizedError(detail="Invalid token payload")

        except Exception:
            raise UnauthorizedError(
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Check if user exists, upsert if missing
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        from app.core.credit_costs import DEFAULT_CREDITS

        user = User(
            email=email,
            name=name or "Unknown User",
            provider="google",
            credits_remaining=DEFAULT_CREDITS,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user
