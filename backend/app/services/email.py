"""
services/email.py
─────────────────
Sends OTP emails via Gmail SMTP with proper SSL cert handling for macOS.

Key fixes:
  1. ConnectionConfig is built inside send_otp_email() so credentials are
     always read fresh (not cached at module load time).
  2. Sets SSL_CERT_FILE env var to certifi's bundle before connecting,
     which aiosmtplib (used by fastapi-mail) picks up automatically.
     This fixes SSL_CERTIFICATE_VERIFY_FAILED on macOS Python.
"""

import os
import certifi

# Point Python's SSL to certifi's CA bundle — fixes macOS cert verification.
# Must be done before any SMTP connection is made.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import get_settings


async def send_otp_email(email: str, otp_code: str) -> None:
    """
    Sends a 6-digit OTP code to the user's email via Gmail SMTP (port 587 + STARTTLS).
    Raises on failure — caller (auth.py) handles and logs the real error.
    """
    settings = get_settings()

    # Ensure certifi certs are used (important for macOS)
    os.environ["SSL_CERT_FILE"] = certifi.where()

    # Build config fresh every call — prevents stale credentials from being cached.
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_EMAIL,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_EMAIL,
        MAIL_FROM_NAME="CryptoVault",
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                max-width: 480px; margin: auto; padding: 40px;
                background: #f9f9f9; border-radius: 16px;">

        <h2 style="color: #111; margin-bottom: 8px;">Verify your CryptoVault account</h2>
        <p style="color: #666; margin-bottom: 28px;">
            Enter the code below to verify your email address.
            This code expires in <strong>10 minutes</strong>.
        </p>

        <div style="background: #fff; border: 1px solid #e5e7eb;
                    border-radius: 12px; padding: 28px; text-align: center;">
            <span style="font-size: 40px; font-weight: 700;
                         letter-spacing: 14px; color: #0A84FF; font-family: monospace;">
                {otp_code}
            </span>
        </div>

        <p style="color: #aaa; font-size: 13px; margin-top: 24px;">
            If you did not create a CryptoVault account, you can safely ignore this email.
        </p>
    </div>
    """

    message = MessageSchema(
        subject="Your CryptoVault verification code",
        recipients=[email],
        body=html_content,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)