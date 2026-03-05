"""
services/otp.py
───────────────
Generates and validates 6-digit OTP codes.

How it works:
  - Generate a random 6-digit number like 482910
  - Save it to the user's row in the database
  - Also save the time it was created (expires after 10 minutes)
  - When user submits the code, compare and check time
"""

import random
import string
from datetime import datetime, timezone, timedelta


OTP_EXPIRE_MINUTES = 10


def generate_otp() -> str:
    """
    Returns a random 6-digit string like '482910'.
    We use string so leading zeros are kept e.g. '034521'.
    """
    return "".join(random.choices(string.digits, k=6))


def is_otp_expired(otp_created_at: datetime) -> bool:
    """
    Returns True if the OTP was created more than 10 minutes ago.
    """
    now = datetime.now(timezone.utc)

    # Make sure otp_created_at is timezone-aware
    if otp_created_at.tzinfo is None:
        otp_created_at = otp_created_at.replace(tzinfo=timezone.utc)

    expiry_time = otp_created_at + timedelta(minutes=OTP_EXPIRE_MINUTES)
    return now > expiry_time