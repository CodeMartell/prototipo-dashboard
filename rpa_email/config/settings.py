from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]


def _date(name: str) -> datetime | None:
    value = os.getenv(name, "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"{name} deve usar o formato AAAA-MM-DD") from exc


@dataclass(frozen=True)
class Settings:
    imap_host: str
    imap_port: int
    mailbox: str
    email_user: str
    email_password: str
    subject_filter: str
    sender_filter: str
    date_from: datetime | None
    date_to: datetime | None
    database_url: str
    attachments_dir: Path

    @classmethod
    def from_env(cls, env_file: Path | None = None) -> "Settings":
        if env_file:
            load_dotenv(env_file)
        else:
            load_dotenv(ROOT_DIR.parent / ".env")
            load_dotenv(ROOT_DIR / ".env")
        required = {
            "EMAIL_USER": os.getenv("EMAIL_USER", "").strip(),
            "EMAIL_PASSWORD": os.getenv("EMAIL_PASSWORD", "").strip(),
            "DATABASE_URL": os.getenv("DATABASE_URL", "").strip(),
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise ValueError("Variaveis obrigatorias ausentes: " + ", ".join(missing))
        date_from, date_to = _date("EMAIL_DATE_FROM"), _date("EMAIL_DATE_TO")
        if date_from and date_to and date_from > date_to:
            raise ValueError("EMAIL_DATE_FROM nao pode ser posterior a EMAIL_DATE_TO")
        return cls(
            imap_host=os.getenv("IMAP_HOST", "imap.gmail.com").strip(),
            imap_port=int(os.getenv("IMAP_PORT", "993")),
            mailbox=os.getenv("IMAP_MAILBOX", "INBOX").strip(),
            email_user=required["EMAIL_USER"],
            email_password=required["EMAIL_PASSWORD"],
            subject_filter=os.getenv("EMAIL_SUBJECT_FILTER", "").strip(),
            sender_filter=os.getenv("EMAIL_SENDER_FILTER", "").strip().lower(),
            date_from=date_from,
            date_to=date_to,
            database_url=required["DATABASE_URL"],
            attachments_dir=Path(os.getenv("ATTACHMENTS_DIR", str(ROOT_DIR / "resources" / "attachments"))),
        )
