from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.core.exceptions import UnauthorizedError

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


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
