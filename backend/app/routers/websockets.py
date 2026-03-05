"""
routers/websockets.py
─────────────────────
WebSocket endpoint that streams live crypto prices to the frontend.

Strategy:
  - Each connected client gets prices pushed every 10 seconds
  - Prices come from the Gemini public API (same service used by portfolio)
  - If Gemini is unavailable, stale cached prices are served
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.gemini import get_prices_bulk

router = APIRouter(tags=["WebSockets"])

# All coins the market page tracks (Gemini symbols)
MARKET_SYMBOLS = [
    "btcusd", "ethusd", "solusd", "bnbusd", "avaxusd",
    "linkusd", "maticusd", "dotusd", "ltcusd", "dogeusd",
]

@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """
    Accepts a WebSocket connection and pushes live Gemini prices every 10 seconds.
    Format pushed: { "btcusd": "73500.00", "ethusd": "2143.00", ... }
    """
    await websocket.accept()
    try:
        while True:
            try:
                prices_map = await get_prices_bulk(MARKET_SYMBOLS)
                # Build payload: { symbol: price_string }
                payload: dict[str, str] = {}
                for symbol, (price, _is_stale) in prices_map.items():
                    if price > 0:
                        payload[symbol] = str(price)

                if payload:
                    await websocket.send_text(json.dumps(payload))

            except Exception as e:
                print(f"WS price fetch error: {e}")

            # Push every 10 seconds
            await asyncio.sleep(10)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket connection error: {e}")
