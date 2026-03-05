"""
routers/auth.py
───────────────
Authentication routes — now includes OTP verification.

POST /auth/signup         → creates account + sends OTP email
POST /auth/verify-otp     → user submits the 6-digit code
POST /auth/resend-otp     → user asks for a new code
POST /auth/login          → only works after OTP is verified
GET  /auth/me             → returns logged-in user profile
"""

from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import shutil
import uuid
import os

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.schemas import (
    SignupRequest, LoginRequest, TokenResponse, UserResponse,
    OTPVerifyRequest, ResendOTPRequest, MessageResponse,
)
from app.services.otp import generate_otp, is_otp_expired
from app.services.email import send_otp_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=MessageResponse, status_code=201)
async def signup(
    payload: SignupRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.
    → Saves user to DB (unverified)
    → Generates 6-digit OTP
    → Fires OTP email in the background (non-blocking — returns instantly)
    → User must call /verify-otp next
    """
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()

    if existing and existing.is_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Generate OTP
    otp = generate_otp()
    now = datetime.now(timezone.utc)

    if existing and not existing.is_verified:
        # User signed up before but never verified — update their OTP
        existing.hashed_password = hash_password(payload.password)
        existing.otp_code = otp
        existing.otp_created_at = now
        await db.flush()
    else:
        # Brand new user
        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            otp_code=otp,
            otp_created_at=now,
            is_verified=False,
        )
        db.add(user)
        await db.flush()

    # Queue the OTP email to send in the background — response returns immediately
    email_to_send = payload.email
    otp_to_send = otp
    async def send_email_bg():
        try:
            await send_otp_email(email_to_send, otp_to_send)
            print(f"✅ OTP email sent to {email_to_send}")
        except Exception as exc:
            print(f"❌ SMTP ERROR for {email_to_send}: {exc}")

    import asyncio
    background_tasks.add_task(asyncio.ensure_future, send_email_bg())

    return MessageResponse(message=f"Verification code sent to {payload.email}. Check your inbox.")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    User submits their 6-digit code.
    → Checks the code matches what we stored
    → Checks the code has not expired (10 minutes)
    → Marks the account as verified
    → Returns a JWT so user is logged in immediately
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found with this email")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already verified. Please login.")

    if user.otp_code != payload.otp_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect verification code")

    if not user.otp_created_at or is_otp_expired(user.otp_created_at):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code has expired. Please request a new one.")

    # All good — mark as verified and clear the OTP
    user.is_verified = True
    user.otp_code = None
    user.otp_created_at = None
    await db.flush()

    # Return JWT so user is logged in straight away
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(
    payload: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    User clicks 'Resend Code'.
    → Generates a fresh OTP
    → Emails it in the background (non-blocking)
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found with this email")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is already verified")

    # Generate fresh OTP
    otp = generate_otp()
    user.otp_code = otp
    user.otp_created_at = datetime.now(timezone.utc)
    await db.flush()

    email_to_send = payload.email
    otp_to_send = otp
    async def send_email_bg():
        try:
            await send_otp_email(email_to_send, otp_to_send)
            print(f"✅ Resend OTP email sent to {email_to_send}")
        except Exception as exc:
            print(f"❌ SMTP ERROR resend for {email_to_send}: {exc}")

    import asyncio
    background_tasks.add_task(asyncio.ensure_future, send_email_bg())

    return MessageResponse(message=f"New verification code sent to {payload.email}")


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login — only works if the account is verified.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first. Check your inbox for the verification code.",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently logged-in user's profile."""
    return current_user


@router.post("/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Safety: ensure directory exists
    os.makedirs("uploads/profiles", exist_ok=True)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = f"uploads/profiles/{filename}"
    
    # Write file to disk
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.profile_picture_url = f"/{filepath}"
    await db.commit()
    return user
