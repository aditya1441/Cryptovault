"""
routers/insights.py
───────────────────
Endpoints for AI-generated text and portfolio insights.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.services.portfolio import build_portfolio
from app.services.ai import generate_portfolio_insights

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("/portfolio")
async def get_portfolio_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches the user's holdings, groups them, and asks the AI for an analysis.
    """
    # 1. Get transactions
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id)
    )
    transactions = result.scalars().all()
    
    # 2. Build portfolio summary
    portfolio = await build_portfolio(list(transactions))
    
    # Convert PortfolioSummary to dict for the LLM
    portfolio_dict = {
        "total_invested": float(portfolio.total_invested),
        "total_current_value": float(portfolio.total_current_value),
        "total_pnl_pct": float(portfolio.total_pnl_pct),
        "holdings": [
            {
                "symbol": h.symbol,
                "quantity": float(h.quantity),
                "avg_buy_price": float(h.avg_buy_price),
                "current_price": float(h.current_price)
            } for h in portfolio.holdings
        ]
    }
    
    # 3. Ask AI
    insights = await generate_portfolio_insights(portfolio_dict)
    return insights
