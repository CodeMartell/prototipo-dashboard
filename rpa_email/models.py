"""Modelos internos do processamento de e-mails."""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class EmailRecord:
    dedup_key: str
    message_id: str
    imap_uid: str
    sender: str
    subject: str
    received_at: datetime | None
    status: str
    details: str = ""
    attachment_count: int = 0


@dataclass
class ExecutionSummary:
    found: int = 0
    processed: int = 0
    duplicated: int = 0
    out_of_pattern: int = 0
    errors: int = 0
