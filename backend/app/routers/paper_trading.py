"""
routers/paper_trading.py
────────────────────────
Endpoints to execute mock buy/sell trades, updating `virtual_balance`
and creating `Transaction` records.
"""

from decimal import Decimal
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionResponse

router = APIRouter(prefix="/paper-trading", tags=["Paper Trading"])

class PaperTradeRequest(BaseModel):
    symbol: str
    coin_name: str
    quantity: Decimal
    purchase_price: Decimal  # the quoted execution price from WS
    type: str  # "buy" or "sell"

    @field_validator("quantity")
    @classmethod
    def gtz_qty(cls, v):
        if v <= 0: raise ValueError("Must be > 0")
        return v
        
    @field_validator("purchase_price")
    @classmethod
    def gtz_price(cls, v):
        if v <= 0: raise ValueError("Must be > 0")
        return v
        
    @field_validator("type")
    @classmethod
    def val_type(cls, v):
        if v not in ("buy", "sell"): raise ValueError("Type must be 'buy' or 'sell'")
        return v

@router.post("/", response_model=TransactionResponse)
async def execute_trade(
    payload: PaperTradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cost_or_proceeds = float(payload.quantity * payload.purchase_price)
    
    if payload.type == "buy":
        if current_user.virtual_balance < cost_or_proceeds:
            raise HTTPException(status_code=400, detail="Insufficient virtual balance")
        current_user.virtual_balance -= cost_or_proceeds
    else:
        # For sell, we should ensure they have enough quantity of this coin.
        # Check current holdings.
        result = await db.execute(
            select(Transaction).where(Transaction.user_id == current_user.id, Transaction.symbol == payload.symbol.lower())
        )
        txs = result.scalars().all()
        buys = sum(tx.quantity for tx in txs if tx.type == "buy")
        sells = sum(tx.quantity for tx in txs if tx.type == "sell")
        net_qty = buys - sells
        if net_qty < payload.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient {payload.symbol.upper()} balance to sell.")
            
        current_user.virtual_balance += cost_or_proceeds

    # Create transaction
    new_tx = Transaction(
        user_id=current_user.id,
        symbol=payload.symbol.lower().strip(),
        coin_name=payload.coin_name,
        type=payload.type,
        quantity=payload.quantity,
        purchase_price=payload.purchase_price,
        trade_date=date.today(),
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(new_tx)
    await db.flush()
    await db.refresh(new_tx)
    
    return new_tx
