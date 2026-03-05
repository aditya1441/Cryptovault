"""
core/config.py
──────────────
Reads every setting from the .env file.
Now includes Gmail settings for sending OTP emails.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # App
    APP_ENV: str = "development"

    # Email (Gmail) — for sending OTP codes
    MAIL_EMAIL: str
    MAIL_PASSWORD: str

    # Google OAuth — fill in your Client ID from Google Cloud Console
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


def get_settings() -> Settings:
    """
    Returns fresh settings on every call — reads from .env each time.
    We intentionally do NOT use @lru_cache here because environment changes
    (like adding GOOGLE_CLIENT_ID) must be picked up without restarting.
    """
    return Settings()
