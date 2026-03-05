"""
schemas/
────────
Pydantic schemas are the "contract" between the frontend and backend.

They do TWO things:
  1. VALIDATE incoming requests — if a field is wrong, Pydantic raises
     a helpful error before your code even runs.
  2. SHAPE outgoing responses — control exactly what JSON gets returned.

The separation: ORM models (models/) know about the database.
                Schemas (schemas/) know about the API interface.
Never expose your ORM model directly — always go through a schema.
"""

from decimal import Decimal
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


# ═══════════════════════════════════════════
#  AUTH  SCHEMAS
# ═══════════════════════════════════════════

class SignupRequest(BaseModel):
    email: EmailStr          # Pydantic validates this is a real email format
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    virtual_balance: float
    profile_picture_url: Optional[str] = None
    created_at: datetime

    # from_attributes=True lets Pydantic read from SQLAlchemy ORM objects
    # (not just plain dicts)
    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════
#  TRANSACTION  SCHEMAS
# ═══════════════════════════════════════════

class TransactionCreate(BaseModel):
    """What the frontend sends when adding a trade."""
    symbol: str           # e.g. "btcusd"
    coin_name: str        # e.g. "Bitcoin"
    quantity: Decimal
    purchase_price: Decimal
    trade_date: date

    @field_validator("quantity")
    @classmethod
    def qty_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Quantity must be greater than zero")
        return v

    @field_validator("purchase_price")
    @classmethod
    def price_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Purchase price must be greater than zero")
        return v

    @field_validator("symbol")
    @classmethod
    def symbol_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    coin_name: str
    type: str
    quantity: Decimal
    purchase_price: Decimal
    trade_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════
#  PORTFOLIO  SCHEMAS  (computed, not stored)
# ═══════════════════════════════════════════

class HoldingDetail(BaseModel):
    """
    One row in the portfolio table.
    This is COMPUTED on the fly — it's never stored in the database.
    """
    symbol: str
    coin_name: str
    quantity: Decimal
    avg_buy_price: Decimal     # Average price across all buy transactions
    total_invested: Decimal    # quantity × avg_buy_price
    current_price: Decimal     # Live from Gemini API (or cached)
    current_value: Decimal     # quantity × current_price
    pnl: Decimal               # current_value − total_invested
    pnl_pct: Decimal           # (pnl / total_invested) × 100
    price_cached: bool         # True if Gemini was unavailable


class PortfolioSummary(BaseModel):
    """
    The top-level numbers shown in the dashboard header cards.
    """
    total_invested: Decimal
    total_current_value: Decimal
    total_pnl: Decimal
    total_pnl_pct: Decimal
    holdings: list[HoldingDetail]


# ═══════════════════════════════════════════
#  OTP  SCHEMAS
# ═══════════════════════════════════════════

class OTPVerifyRequest(BaseModel):
    """What the frontend sends when user types their 6-digit code."""
    email: EmailStr
    otp_code: str

    @field_validator("otp_code")
    @classmethod
    def otp_must_be_6_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v


class ResendOTPRequest(BaseModel):
    """What the frontend sends when user clicks 'Resend Code'."""
    email: EmailStr


class MessageResponse(BaseModel):
    """A simple success message response."""
    message: str

# ═══════════════════════════════════════════
#  ALERT SCHEMAS
# ═══════════════════════════════════════════

class AlertCreate(BaseModel):
    coin_name: str
    symbol: str
    target_price: float
    direction: str

    @field_validator("direction")
    @classmethod
    def direction_val(cls, v: str) -> str:
        if v not in ("above", "below"): raise ValueError("Must be above or below")
        return v

class AlertResponse(BaseModel):
    id: int
    user_id: int
    coin_name: str
    symbol: str
    target_price: float
    direction: str
    triggered: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
