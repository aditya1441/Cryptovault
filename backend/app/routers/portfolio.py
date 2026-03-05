"""
routers/portfolio.py
─────────────────────
The portfolio endpoint that powers the main dashboard.

GET /portfolio  →  returns computed holdings + PnL for the logged-in user

This is NOT a simple database read — it:
  1. Loads the user's transactions from Postgres
  2. Calls the Gemini API (with caching) for current prices
  3. Runs the portfolio engine to compute PnL
  4. Returns the combined result

The response includes `any_price_stale` — if True, the frontend
should show a warning like "⚠ Some prices may be delayed".
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.schemas import PortfolioSummary
from app.services.portfolio import build_portfolio

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioSummary)
async def get_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),   # ← JWT required
):
    """
    Compute and return the full portfolio for the authenticated user.
    Prices are fetched from Gemini (cached for 60 seconds).
    """
    # Load this user's transactions only
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id)
    )
    transactions = result.scalars().all()

    # Run the portfolio calculation engine
    portfolio = await build_portfolio(list(transactions))
    return portfolio
