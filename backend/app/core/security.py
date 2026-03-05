"""
core/security.py
────────────────
All cryptography lives here — password hashing and JWT tokens.

Password hashing (Argon2):
  When a user signs up, we NEVER store their actual password.
  We store a "hash" — a scrambled version. To verify at login,
  we hash what they typed and compare the two hashes.
  Argon2 is the gold standard: deliberately slow to defeat brute-force attacks.

JWT (JSON Web Token):
  A signed string like: header.payload.signature
  The payload contains the user's ID. The signature is made with our JWT_SECRET.
  Anyone can read the payload, but only our server can MAKE a valid signature.
  So when the frontend sends back a JWT, we verify the signature — if it's valid,
  we trust the user ID inside it.
"""

from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import get_settings

settings = get_settings()

# ── Password hashing ──────────────────────────────────────────────────────────
# schemes=["argon2"] means: use Argon2 as the hashing algorithm.
# deprecated="auto" means: if we ever switch algorithms, old hashes still work.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Turn 'mypassword123' into '$argon2id$v=19$m=65536...' """
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if 'mypassword123' matches the stored hash."""
    return pwd_context.verify(plain, hashed)


# ── JWT tokens ────────────────────────────────────────────────────────────────
def create_access_token(user_id: int) -> str:
    """
    Create a JWT that contains the user's ID and an expiry timestamp.
    The token is signed with our secret key — tamper-proof.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),   # "sub" (subject) is a standard JWT claim
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """
    Verify the token's signature and return the user_id inside it.
    Raises HTTP 401 if the token is invalid, expired, or tampered with.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return int(user_id)
    except JWTError:
        raise credentials_exception
