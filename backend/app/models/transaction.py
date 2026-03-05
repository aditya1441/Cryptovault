"""
models/transaction.py
──────────────────────
The ORM model for the `transactions` table.

Why NUMERIC for prices?
  Python's float has floating-point errors:
    >>> 0.1 + 0.2
    0.30000000000000004   ← WRONG for financial math!

  PostgreSQL's NUMERIC(precision, scale) stores EXACT decimal numbers.
  We pair it with Python's Decimal type for all calculations.

  precision=20 means up to 20 significant digits total.
  scale=8     means up to 8 digits after the decimal point.
  This covers everything from tiny alt-coins ($0.00000001) to Bitcoin ($100,000+).

  purchase_price: the price per coin WHEN the user bought it — stored forever
  symbol:         e.g. "btcusd", "ethusd" — matches Gemini's API naming
"""

from decimal import Decimal
from datetime import datetime, timezone, date
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign key → links this transaction to its owner
    # ondelete="CASCADE" means: if the user is deleted, their transactions go too
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,    # Index for fast "give me all transactions for user X" queries
    )

    symbol: Mapped[str] = mapped_column(String(20), nullable=False)    # e.g. "btcusd"
    coin_name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Bitcoin"
    type: Mapped[str] = mapped_column(String(10), default="buy")       # "buy" or "sell"

    # NUMERIC(20,8) → up to 20 digits, 8 after decimal
    # Handles: 0.00000001 BTC (satoshi) or 100000.00000000 BTC
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)

    # The date the user actually made the trade (can be in the past)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Many-to-one: many Transactions belong to one User
    user: Mapped["User"] = relationship("User", back_populates="transactions")  # noqa: F821

    @property
    def total_cost(self) -> Decimal:
        """How much the user paid in total for this lot."""
        return self.quantity * self.purchase_price

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} symbol={self.symbol} qty={self.quantity}>"
