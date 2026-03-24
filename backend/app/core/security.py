from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.core.exceptions import UnauthorizedError

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.NEXTAUTH_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.NEXTAUTH_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verifies the stateless NextAuth JWT from the frontend."""
    # NextAuth uses HKDF to derive the actual encryption key from the secret,
    # but for this MVP, we will rely on NextAuth handling the cookie session natively
    # via API routes.
    # To truly verify a NextAuth v4 JWT on an external Python backend, we need the
    # specific HKDF decryption logic.
    # For now, we will decode it directly if NEXTAUTH_SECRET is an exact matched key,
    # or implement a simpler decoding strategy.

    try:
        # Note: In production NextAuth.js (JWE), tokens are encrypted not just signed.
        # A common MVP workaround is having the frontend pass the Provider-issued AccessToken
        # or having Next.js hit an internal `/api/auth/session` endpoint to validate,
        # but decoding a standard HS256 signed JWT is the standard approach here assuming
        # a custom credential/signing strategy.
        payload = jwt.decode(token, settings.NEXTAUTH_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise UnauthorizedError(detail="Could not validate credentials")
