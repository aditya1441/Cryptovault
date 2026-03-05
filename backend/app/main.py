"""
app/main.py
───────────
The FastAPI application entry point.

This file:
  1. Creates the FastAPI app instance
  2. Adds CORS middleware (so the React frontend on localhost:5173 can talk to it)
  3. Wires up all the routers (auth, transactions, portfolio)
  4. Creates database tables on startup (dev only)
  5. Exposes a health-check endpoint

Running the server:
  cd backend
  uvicorn app.main:app --reload

Then visit:
  http://localhost:8000/docs   ← Interactive API docs (Swagger UI)
  http://localhost:8000/redoc  ← Alternative docs (ReDoc)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.database import engine, Base
from app.core.config import get_settings
from app.core.scheduler_config import start_scheduler, stop_scheduler

# Import models so SQLAlchemy knows about them before creating tables
from app.models import user, transaction  # noqa: F401

from app.routers import auth, transactions, portfolio, websockets, paper_trading, insights, reports
from app.routers import google_auth

settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code here runs ONCE when the server starts.
    In production, use Alembic migrations instead of create_all().
    """
    if settings.APP_ENV == "development":
        # Auto-create tables — fine for dev, use Alembic for production
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅  Database tables created (development mode)")
        
    start_scheduler()
    yield
    # Code after yield runs on shutdown (cleanup if needed)
    stop_scheduler()
    await engine.dispose()
    print("✅  Database connections closed")


# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="CryptoVault API",
    description="Track your cryptocurrency portfolio with real-time PnL",
    version="1.0.0",
    lifespan=lifespan,
)

os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ── CORS Middleware ───────────────────────────────────────────────────────────
# CORS = Cross-Origin Resource Sharing.
# Browsers block requests from one origin (localhost:5173) to another
# (localhost:8000) by default. This middleware tells the browser it's allowed.
#
# For production, replace "*" with your actual frontend domain:
#   allow_origins=["https://cryptovault.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(google_auth.router)
app.include_router(transactions.router)
app.include_router(portfolio.router)
app.include_router(websockets.router)
app.include_router(paper_trading.router)
app.include_router(insights.router)
app.include_router(reports.router)
try:
    from app.routers import alerts
    app.include_router(alerts.router)
except ImportError:
    pass


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    """
    Quick endpoint to check the server is alive.
    Useful for deployment platforms (Render, Railway) to monitor uptime.
    """
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "CryptoVault API",
        "docs": "/docs",
        "health": "/health",
    }
