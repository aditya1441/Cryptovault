"""
core/scheduler_config.py
────────────────────────
Configures APScheduler to run background tasks like checking price alerts.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.alert import Alert
from app.models.user import User
from app.services.gemini import get_prices_bulk
# Assuming we use the existing email service to send a notification (mocking SMS)
from app.services.email import send_otp_email

scheduler = AsyncIOScheduler()

async def check_price_alerts():
    """
    Background job that runs every minute:
    1. Finds all active (untriggered) alerts
    2. Fetches current prices for those coins
    3. Triggers the alert if condition is met
    """
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Alert).options(selectinload(Alert.user)).where(Alert.triggered == False)
            )
            active_alerts = result.scalars().all()

            if not active_alerts:
                return  # Nothing to do

            symbols = list({a.symbol for a in active_alerts})
            
            # We reuse the gemini bulk prices service from the portfolio
            prices_map = await get_prices_bulk(symbols)

            for alert in active_alerts:
                current_price, is_stale = prices_map.get(alert.symbol, (0, True))
                if is_stale or current_price == 0:
                    continue

                # Check logic
                hit = False
                if alert.direction == 'above' and float(current_price) >= alert.target_price:
                    hit = True
                elif alert.direction == 'below' and float(current_price) <= alert.target_price:
                    hit = True

                if hit:
                    # Mark triggered so it doesn't fire again
                    alert.triggered = True
                    await db.flush()

                    user: User = alert.user
                    
                    # In a real app we'd use Twilio SMS here. We simulate with an email/print.
                    msg = f"🔔 CRYPTOVAULT ALERT: {alert.coin_name} hit {alert.target_price}! Current price is {current_price}."
                    print(f"🔥 BACKGROUND ALERT TRIGGERED: Sending SMS to {user.email} -> {msg}")

            await db.commit()
    except Exception as exc:
        print(f"⚠️  Alert scheduler error (will retry next cycle): {exc}")

def start_scheduler():
    """Starts the background scheduler. Called from main.py lifecycle."""
    scheduler.add_job(check_price_alerts, "interval", minutes=1, id="price_alerts_job", replace_existing=True)
    scheduler.start()
    print("✅  APScheduler started (Background Alerts)")

def stop_scheduler():
    scheduler.shutdown()
