"""
core/dependencies.py
────────────────────
FastAPI "dependencies" are reusable functions injected into route handlers.

get_current_user() does three things:
  1. Extracts the Bearer token from the Authorization header
  2. Verifies the JWT signature and reads the user_id
  3. Loads the full User row from Postgres

Usage in a route:
  @router.get("/portfolio")
  async def get_portfolio(user: User = Depends(get_current_user)):
      # user is guaranteed to be a valid, logged-in user
      ...

If the token is missing or invalid, FastAPI automatically returns HTTP 401
before your route function even runs.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# This tells FastAPI where clients send their token.
# The tokenUrl is used by the built-in /docs UI to log in.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and verify the JWT from the request header,
    then return the corresponding User from the database.
    """
    user_id = decode_access_token(token)   # Raises 401 if invalid

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
