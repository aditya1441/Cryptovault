"""
services/portfolio.py
──────────────────────
The Portfolio Engine — the brain of the app.

Given a user's list of transactions, this service:
  1. Groups them by coin (symbol)
  2. Calculates average buy price across multiple purchases
  3. Fetches current prices from Gemini (with caching)
  4. Computes PnL (Profit and Loss) for each holding
  5. Rolls up totals for the dashboard header

Why average buy price (not just the last purchase)?
  If you bought 1 BTC at $50,000 and later 1 BTC at $60,000,
  your average cost is $55,000. This is the correct basis for PnL.

  avg_buy_price = total_cost / total_quantity
               = ($50,000 + $60,000) / 2
               = $55,000

PnL calculation:
  total_invested  = quantity × avg_buy_price
  current_value   = quantity × current_price
  pnl             = current_value − total_invested
  pnl_pct         = (pnl / total_invested) × 100
"""

from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict

from app.models.transaction import Transaction
from app.schemas.schemas import HoldingDetail, PortfolioSummary
from app.services.gemini import get_prices_bulk


ZERO = Decimal("0")
HUNDRED = Decimal("100")


async def build_portfolio(transactions: list[Transaction]) -> PortfolioSummary:
    """
    Build a complete portfolio summary from a user's transactions.
    """
    if not transactions:
        return PortfolioSummary(
            total_invested=ZERO,
            total_current_value=ZERO,
            total_pnl=ZERO,
            total_pnl_pct=ZERO,
            holdings=[],
        )

    # ── Step 1: Group transactions by symbol ──────────────────────────────────
    # defaultdict(list) auto-creates an empty list for new keys
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for tx in transactions:
        grouped[tx.symbol].append(tx)

    # ── Step 2: Fetch all current prices in one concurrent batch ──────────────
    symbols = list(grouped.keys())
    price_map = await get_prices_bulk(symbols)
    # price_map = {"btcusd": (Decimal("67843.50"), False), "ethusd": (Decimal("3512.00"), True), ...}

    # ── Step 3: Calculate per-holding metrics ─────────────────────────────────
    holdings: list[HoldingDetail] = []

    for symbol, txs in grouped.items():
        coin_name = txs[0].coin_name

        buys = [tx for tx in txs if getattr(tx, "type", "buy") == "buy"]
        sells = [tx for tx in txs if getattr(tx, "type", "buy") == "sell"]

        total_buy_qty: Decimal = sum((tx.quantity for tx in buys), ZERO)
        total_buy_cost: Decimal = sum((tx.total_cost for tx in buys), ZERO)

        # Average buy price = weighted average across all purchases
        avg_buy_price = ZERO
        if total_buy_qty > ZERO:
            avg_buy_price = (total_buy_cost / total_buy_qty).quantize(Decimal("0.00000001"), rounding=ROUND_HALF_UP)

        total_sell_qty: Decimal = sum((tx.quantity for tx in sells), ZERO)
        net_qty = total_buy_qty - total_sell_qty

        if net_qty <= ZERO:
            continue  # Sold everything, don't show in portfolio

        total_qty = net_qty

        # Current price from Gemini (may be stale if API was down)
        current_price, is_stale = price_map.get(symbol, (ZERO, True))

        # Current value of the holding
        current_value = (total_qty * current_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_invested = (total_qty * avg_buy_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # PnL
        pnl = (current_value - total_invested).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        pnl_pct = ZERO
        if total_invested != ZERO:
            pnl_pct = ((pnl / total_invested) * HUNDRED).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        holdings.append(HoldingDetail(
            symbol=symbol,
            coin_name=coin_name,
            quantity=total_qty,
            avg_buy_price=avg_buy_price,
            total_invested=total_invested,
            current_price=current_price,
            current_value=current_value,
            pnl=pnl,
            pnl_pct=pnl_pct,
            price_cached=is_stale,
        ))

    # Sort by current value descending (biggest holding first)
    holdings.sort(key=lambda h: h.current_value, reverse=True)

    # ── Step 4: Roll-up totals ────────────────────────────────────────────────
    grand_invested = sum((h.total_invested for h in holdings), ZERO)
    grand_value = sum((h.current_value for h in holdings), ZERO)
    grand_pnl = (grand_value - grand_invested).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    grand_pnl_pct = ZERO
    if grand_invested != ZERO:
        grand_pnl_pct = ((grand_pnl / grand_invested) * HUNDRED).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    return PortfolioSummary(
        total_invested=grand_invested.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        total_current_value=grand_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        total_pnl=grand_pnl,
        total_pnl_pct=grand_pnl_pct,
        holdings=holdings,
    )
