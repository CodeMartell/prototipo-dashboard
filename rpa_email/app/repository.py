from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import contextmanager

import psycopg

from .models import EmailRecord


class ProcessingRepository(ABC):
    """Contrato de persistencia, permitindo testes com implementacoes substitutas."""

    @abstractmethod
    def initialize(self) -> None: ...

    @abstractmethod
    def is_terminal(self, dedup_key: str) -> bool: ...

    @abstractmethod
    def save(self, record: EmailRecord) -> None: ...


class PostgresProcessingRepository(ProcessingRepository):
    def __init__(self, database_url: str):
        self._database_url = database_url

    @contextmanager
    def _connect(self):
        with psycopg.connect(self._database_url, connect_timeout=3) as connection:
            yield connection

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS email_processing (
                    id BIGSERIAL PRIMARY KEY,
                    dedup_key VARCHAR(300) NOT NULL UNIQUE,
                    message_id VARCHAR(500),
                    imap_uid VARCHAR(100) NOT NULL,
                    sender VARCHAR(320),
                    subject TEXT,
                    received_at TIMESTAMPTZ,
                    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    status VARCHAR(30) NOT NULL,
                    details TEXT,
                    attachment_count INTEGER NOT NULL DEFAULT 0
                )
                """
            )

    def is_terminal(self, dedup_key: str) -> bool:
        with self._connect() as connection:
            row = connection.execute(
                """SELECT 1 FROM email_processing
                   WHERE dedup_key = %s
                     AND status IN ('PROCESSADO', 'FORA_DO_PADRAO')""",
                (dedup_key,),
            ).fetchone()
        return row is not None

    def save(self, record: EmailRecord) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO email_processing
                (dedup_key, message_id, imap_uid, sender, subject, received_at,
                 status, details, attachment_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (dedup_key) DO UPDATE SET
                    processed_at = NOW(), status = EXCLUDED.status,
                    details = EXCLUDED.details,
                    attachment_count = EXCLUDED.attachment_count
                """,
                (
                    record.dedup_key, record.message_id, record.imap_uid,
                    record.sender, record.subject, record.received_at,
                    record.status, record.details, record.attachment_count,
                ),
            )


class SqliteProcessingRepository(ProcessingRepository):
    """Repositorio local SQLite para persistencia offline / fallback."""

    def __init__(self, db_path: str | None = None):
        import os
        from pathlib import Path
        root = Path(__file__).resolve().parents[1] / "resources"
        root.mkdir(parents=True, exist_ok=True)
        self._path = db_path or str(root / "email_history.db")

    @contextmanager
    def _connect(self):
        import sqlite3
        conn = sqlite3.connect(self._path)
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS email_processing (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dedup_key TEXT NOT NULL UNIQUE,
                    message_id TEXT,
                    imap_uid TEXT NOT NULL,
                    sender TEXT,
                    subject TEXT,
                    received_at TEXT,
                    processed_at TEXT NOT NULL DEFAULT (datetime('now')),
                    status TEXT NOT NULL,
                    details TEXT,
                    attachment_count INTEGER NOT NULL DEFAULT 0
                )
                """
            )

    def is_terminal(self, dedup_key: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                """SELECT 1 FROM email_processing
                   WHERE dedup_key = ?
                     AND status IN ('PROCESSADO', 'FORA_DO_PADRAO')""",
                (dedup_key,),
            )
            return cur.fetchone() is not None

    def save(self, record: EmailRecord) -> None:
        with self._connect() as conn:
            rec_at = record.received_at.isoformat() if record.received_at else None
            conn.execute(
                """
                INSERT INTO email_processing
                (dedup_key, message_id, imap_uid, sender, subject, received_at,
                 status, details, attachment_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (dedup_key) DO UPDATE SET
                    processed_at = datetime('now'), status = excluded.status,
                    details = excluded.details,
                    attachment_count = excluded.attachment_count
                """,
                (
                    record.dedup_key, record.message_id, record.imap_uid,
                    record.sender, record.subject, rec_at,
                    record.status, record.details, record.attachment_count,
                ),
            )


def get_processing_repository(database_url: str) -> ProcessingRepository:
    """Tenta inicializar PostgreSQL; se inacessivel, faz fallback para SQLite local."""
    import logging
    logger = logging.getLogger(__name__)
    if database_url:
        try:
            repo = PostgresProcessingRepository(database_url)
            repo.initialize()
            logger.info("[DB] Conexao com PostgreSQL estabelecida com sucesso.")
            return repo
        except Exception as exc:
            logger.warning("[DB] PostgreSQL indisponivel (%s). Usando persistencia SQLite local...", exc)
    repo = SqliteProcessingRepository()
    repo.initialize()
    logger.info("[DB] Repositorio SQLite local inicializado.")
    return repo

