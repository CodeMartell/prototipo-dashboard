"""
app/database/session.py
Engine + fábrica de sessões do SQLAlchemy.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL or "sqlite:///./dashboard.db"
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(db_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session() -> Generator[Session, None, None]:
    """Usado via Depends() nos controllers — abre e sempre fecha a sessão."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
