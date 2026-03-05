"""
routers/reports.py
──────────────────
Handles the generation and download of CSV Tax and P/L Reports using
First-In-First-Out (FIFO) calculation logic.
"""

import csv
import io
from decimal import Decimal
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/tax-csv")
async def generate_tax_report_csv(
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Export all transactions and calculated realized PnL via FIFO logic in CSV format.
    """
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == current_user.id).order_by(Transaction.trade_date, Transaction.id)
    )
    transactions = result.scalars().all()
    
    # Simple FIFO calculation
    # We maintain a queue of 'buys' per symbol. 
    # When a 'sell' occurs, we consume from the oldest buys.
    
    buys_queue: dict[str, list[dict]] = {}
    
    realized_gains = [] # List of realized gain events
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Trade Date", "Type", "Coin", "Symbol", "Qty", "Price", "Realized PnL"])

    total_realized_pnl = Decimal("0")

    for tx in transactions:
        sym = tx.symbol
        if sym not in buys_queue:
            buys_queue[sym] = []
            
        if tx.type == "buy":
            buys_queue[sym].append({"qty": tx.quantity, "price": tx.purchase_price})
            writer.writerow([tx.trade_date, "BUY", tx.coin_name, sym.upper(), float(tx.quantity), float(tx.purchase_price), "0.00"])
        else: # sell
            remaining_to_sell = tx.quantity
            sell_price = tx.purchase_price # the price it was sold at
            current_sell_pnl = Decimal("0")
            
            while remaining_to_sell > 0 and len(buys_queue[sym]) > 0:
                oldest_buy = buys_queue[sym][0]
                
                if oldest_buy["qty"] <= remaining_to_sell:
                    # consumed entirely
                    qty_sold = oldest_buy["qty"]
                    buy_price = oldest_buy["price"]
                    pnl = qty_sold * (sell_price - buy_price)
                    current_sell_pnl += pnl
                    remaining_to_sell -= qty_sold
                    buys_queue[sym].pop(0)
                else:
                    # partially consumed
                    qty_sold = remaining_to_sell
                    buy_price = oldest_buy["price"]
                    pnl = qty_sold * (sell_price - buy_price)
                    current_sell_pnl += pnl
                    oldest_buy["qty"] -= qty_sold
                    remaining_to_sell = Decimal("0")
                    
            total_realized_pnl += current_sell_pnl
            
            writer.writerow([
                tx.trade_date, "SELL", tx.coin_name, sym.upper(), 
                float(tx.quantity), float(sell_price), f"{float(current_sell_pnl):.2f}"
            ])
            
    writer.writerow([])
    writer.writerow(["", "", "", "", "", "Total Realized PnL:", f"{float(total_realized_pnl):.2f}"])

    # Prepare response
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=cryptovault_tax_report.csv"
    
    return response
