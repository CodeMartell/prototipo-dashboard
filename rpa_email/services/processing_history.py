from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import contextmanager

from rpa_email.models import EmailRecord


class ProcessingRepository(ABC):
    """Contrato de persistencia, permitindo testes com implementacoes substitutas."""

    @abstractmethod
    def initialize(self) -> None: ...

    @abstractmethod
    def is_terminal(self, dedup_key: str) -> bool: ...

    @abstractmethod
    def save(self, record: EmailRecord) -> None: ...


class SqliteProcessingRepository(ProcessingRepository):
    """Histórico local do robô; não armazena os valores dos KPIs."""

    def __init__(self, db_path: str | None = None):
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

