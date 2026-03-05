"""
models/user.py
──────────────
The ORM model for the `users` table.

ORM = Object-Relational Mapper.  Instead of writing raw SQL like:
    SELECT * FROM users WHERE id = 1;
you write Python like:
    user = await db.get(User, 1)

SQLAlchemy translates Python objects ↔ database rows automatically.

Column types:
  - String     → VARCHAR  (email, hashed_password)
  - Boolean    → BOOLEAN  (is_active)
  - DateTime   → TIMESTAMP
  - Integer    → INTEGER  (primary key, auto-incremented by Postgres)
"""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str] = mapped_column(String(255), nullable=True, unique=True, index=True)

    # ── Paper Trading & Profile ──────────────────────────────────────────────
    virtual_balance: Mapped[float] = mapped_column(Float, default=100000.0)
    profile_picture_url: Mapped[str] = mapped_column(String(500), nullable=True)
    # ─────────────────────────────────────────────────────────────────────────

    # ── OTP fields ────────────────────────────────────────────────────────────
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    otp_code: Mapped[str] = mapped_column(String(6), nullable=True)
    otp_created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    # ─────────────────────────────────────────────────────────────────────────

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
