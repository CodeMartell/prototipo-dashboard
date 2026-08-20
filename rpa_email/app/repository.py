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
        with psycopg.connect(self._database_url) as connection:
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
