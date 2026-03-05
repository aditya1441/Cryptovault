"""
routers/transactions.py
────────────────────────
Protected endpoints for managing trades.

Every route here uses `Depends(get_current_user)` — this means FastAPI
will reject the request with HTTP 401 if no valid JWT is provided.

POST   /transactions        →  log a new trade
GET    /transactions        →  list all your trades
DELETE /transactions/{id}   →  remove a trade

The WHERE clause `Transaction.user_id == current_user.id` on every
database query ensures users can ONLY see their own data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=201)
async def add_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),   # ← JWT required
):
    """
    Log a new cryptocurrency trade.

    Pydantic validates the payload before this function runs:
    - quantity > 0
    - purchase_price > 0
    - symbol is lowercased
    """
    tx = Transaction(
        user_id=current_user.id,   # Hard-coded to the logged-in user — can't fake this
        symbol=payload.symbol,
        coin_name=payload.coin_name,
        quantity=payload.quantity,
        purchase_price=payload.purchase_price,
        trade_date=payload.trade_date,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    return tx


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all transactions belonging to the logged-in user.
    The WHERE clause ensures isolation — user A cannot see user B's trades.
    """
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.trade_date.desc())
    )
    return result.scalars().all()


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a transaction. Only the owner can delete their own transactions.
    Attempting to delete another user's transaction returns 404 (not 403),
    to avoid leaking information about which transaction IDs exist.
    """
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,   # ← ownership check
        )
    )
    tx = result.scalar_one_or_none()

    if tx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    await db.delete(tx)
    # No return — 204 No Content
