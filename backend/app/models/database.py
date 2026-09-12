"""
Kisaan Mitr — Database Engine & Session Factory
SQLAlchemy 2.0 with QueuePool and pre-ping for production stability.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

_engine_kwargs = {
    "pool_pre_ping": True,
    "echo": settings.DEBUG,
}

if not settings.DATABASE_URL.startswith("sqlite:"):
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables from ORM models. Used for dev convenience."""
    Base.metadata.create_all(bind=engine, checkfirst=True)