"""
app/database/session.py
Engine + fábrica de sessões do SQLAlchemy.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

from pathlib import Path

settings = get_settings()
ROOT_DIR = Path(__file__).resolve().parents[3]

db_url = settings.DATABASE_URL or "sqlite:///./dashboard.db"
if db_url.startswith("sqlite:///"):
    sqlite_file = db_url.replace("sqlite:///", "")
    file_path = Path(sqlite_file)
    if not file_path.is_absolute():
        file_path = (ROOT_DIR / file_path).resolve()
    db_url = f"sqlite:///{file_path.as_posix()}"
elif db_url.startswith("postgresql://"):
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
