"""
Google OAuth route — POST /auth/google
Verifies the Google credential (ID token) sent from the frontend,
creates or fetches the user, and returns a JWT.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import create_access_token
from app.core.config import get_settings
from app.models.user import User
from app.schemas.schemas import TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication (Google)"])

class GoogleAuthRequest(BaseModel):
    credential: str  # The raw ID token from the Google One Tap / Sign-In button

@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Accept a Google ID token from the frontend.
    Verify it against Google's tokeninfo endpoint.
    Create or fetch the user, then return a JWT.
    """
    settings = get_settings()

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Add GOOGLE_CLIENT_ID to .env",
        )

    # Verify the token with Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.credential},
                timeout=10.0,
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
        
        token_data = resp.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to verify Google token: {exc}")

    # Ensure the token was issued for our client
    if token_data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token audience mismatch")

    google_id = token_data.get("sub")
    email = token_data.get("email")

    if not google_id or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete Google profile")

    # Fetch or create the user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Update google_id if not set (e.g. user previously signed up with email)
        if not user.google_id:
            user.google_id = google_id
        # Auto-verify since Google confirmed the email
        user.is_verified = True
        await db.flush()
    else:
        user = User(
            email=email,
            google_id=google_id,
            hashed_password=None,
            is_verified=True,      # Google already verified the email
        )
        db.add(user)
        await db.flush()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)
