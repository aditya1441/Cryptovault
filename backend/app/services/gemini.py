"""
services/gemini.py
──────────────────
Fetches real-time cryptocurrency prices from the Gemini public API.

Gemini endpoint:  GET https://api.gemini.com/v1/pubticker/{symbol}
Example:          GET https://api.gemini.com/v1/pubticker/btcusd
Response excerpt: { "last": "67843.50", "bid": "67840.00", ... }

Caching (1-minute TTL):
  The Gemini API is free and public, but hitting it on EVERY request
  would be slow and could get rate-limited. So we store the price in
  memory with a timestamp. If the cached price is less than 60 seconds
  old, we return it instantly. Otherwise, we fetch fresh.

  _price_cache structure:
    { "btcusd": {"price": Decimal("67843.50"), "fetched_at": datetime(...)} }

Graceful degradation:
  If Gemini is down, we return the last cached price and set a flag
  `is_stale=True`. The frontend can then show "⚠ Price data may be delayed".
  This prevents the entire portfolio page from crashing.
"""

import httpx
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

GEMINI_BASE = "https://api.gemini.com/v1"
CACHE_TTL_SECONDS = 60


@dataclass
class CacheEntry:
    price: Decimal
    fetched_at: datetime
    is_stale: bool = False


# Module-level cache — lives for the lifetime of the server process
_price_cache: dict[str, CacheEntry] = {}


async def get_price(symbol: str) -> tuple[Decimal, bool]:
    """
    Fetch the current price for a symbol (e.g. "btcusd").

    Returns:
        (price, is_stale)
        is_stale=True means we're serving a cached price because Gemini was unreachable.
    """
    symbol = symbol.lower()
    now = datetime.now(timezone.utc)

    # ── Cache hit? ────────────────────────────────────────────────────────────
    cached = _price_cache.get(symbol)
    if cached and (now - cached.fetched_at) < timedelta(seconds=CACHE_TTL_SECONDS):
        return cached.price, False   # Fresh cache → not stale

    # ── Fetch from Gemini ─────────────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{GEMINI_BASE}/pubticker/{symbol}")
            resp.raise_for_status()
            data = resp.json()
            price = Decimal(str(data["last"]))   # str() first avoids float precision loss

        # Store in cache
        _price_cache[symbol] = CacheEntry(price=price, fetched_at=now)
        return price, False

    except Exception as exc:
        # ── Gemini is down — try to serve stale cache ─────────────────────────
        if cached:
            return cached.price, True   # Return old price, mark as stale
        # No cache at all → re-raise so the caller can handle it
        raise RuntimeError(f"Gemini API unavailable for {symbol} and no cache exists: {exc}")


async def get_prices_bulk(symbols: list[str]) -> dict[str, tuple[Decimal, bool]]:
    """
    Fetch prices for multiple coins concurrently using asyncio.
    This is much faster than fetching one by one in a loop.
    """
    import asyncio

    tasks = {symbol: get_price(symbol) for symbol in set(symbols)}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    output: dict[str, tuple[Decimal, bool]] = {}
    for symbol, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            # Individual coin failed — use 0 price with stale flag
            output[symbol] = (Decimal("0"), True)
        else:
            output[symbol] = result

    return output
