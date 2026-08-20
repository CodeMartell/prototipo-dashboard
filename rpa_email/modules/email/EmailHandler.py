from __future__ import annotations

import imaplib
import re
from email import message_from_bytes, policy
from email.header import decode_header, make_header
from email.message import Message
from pathlib import Path


def decode_text(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except (LookupError, UnicodeDecodeError):
        return value


def safe_filename(filename: str) -> str:
    name = Path(filename).name.replace("\x00", "")
    name = re.sub(r"[^\w.() -]", "_", name, flags=re.UNICODE).strip(" .")
    return name[:180] or "anexo_sem_nome"


class EmailHandler:
    """Responsavel somente pela infraestrutura IMAP e pelos anexos."""

    def __init__(self, host: str, port: int, user: str, password: str, mailbox: str):
        self._host, self._port = host, port
        self._user, self._password = user, password
        self._mailbox = mailbox

    def connect(self) -> imaplib.IMAP4_SSL:
        client = imaplib.IMAP4_SSL(self._host, self._port)
        client.login(self._user, self._password)
        status, _ = client.select(self._mailbox, readonly=True)
        if status != "OK":
            client.logout()
            raise ConnectionError(f"Nao foi possivel abrir a caixa {self._mailbox}")
        return client

    @staticmethod
    def search(client: imaplib.IMAP4_SSL, criteria: list[str]) -> list[bytes]:
        status, data = client.uid("search", None, *criteria)
        if status != "OK":
            raise ConnectionError("Falha ao buscar e-mails no IMAP")
        return data[0].split() if data and data[0] else []

    @staticmethod
    def fetch(client: imaplib.IMAP4_SSL, uid: bytes) -> Message:
        status, payload = client.uid("fetch", uid, "(RFC822)")
        if status != "OK" or not payload or not isinstance(payload[0], tuple):
            raise ValueError("Servidor nao retornou o conteudo do e-mail")
        return message_from_bytes(payload[0][1], policy=policy.default)

    @staticmethod
    def save_attachments(message: Message, destination: Path) -> int:
        parts = [part for part in message.walk() if part.get_content_disposition() == "attachment"]
        if not parts:
            return 0
        destination.mkdir(parents=True, exist_ok=True)
        for index, part in enumerate(parts, start=1):
            name = safe_filename(decode_text(part.get_filename()) or f"anexo_{index}")
            path = destination / name
            if path.exists():
                path = destination / f"{path.stem}_{index}{path.suffix}"
            path.write_bytes(part.get_payload(decode=True) or b"")
        return len(parts)
