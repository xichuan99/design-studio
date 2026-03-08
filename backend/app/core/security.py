from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import settings

ALGORITHM = "HS256"

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
