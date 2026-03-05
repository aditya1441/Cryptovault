"""
core/database.py
────────────────
Sets up the async database engine and session factory.

Why async?
  Regular SQLAlchemy blocks the entire server thread while waiting for
  Postgres. Async SQLAlchemy yields control back to FastAPI during the
  wait, so thousands of users can be served concurrently.

Key pieces:
  - create_async_engine  → the connection pool to Postgres
  - AsyncSession         → one unit of work (per request)
  - get_db()             → FastAPI dependency that opens/closes sessions
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────
# echo=True prints every SQL statement to the terminal — great for debugging,
# but turn it off in production (set APP_ENV=production).
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),
    pool_pre_ping=True,   # Verify connections are alive before using them
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,   # Keep object attributes readable after commit
    autoflush=False,
)

# ── Base class for all ORM models ─────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:
    """
    Yields one database session per HTTP request.
    The 'async with' block ensures the session is always closed — even if
    an exception is raised — preventing connection leaks.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
