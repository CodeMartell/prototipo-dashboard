from __future__ import annotations

import imaplib
import re
from email import message_from_bytes, policy
from email.header import decode_header, make_header
from email.message import Message
from pathlib import Path
from urllib.parse import unquote


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


def content_disposition_filename(value: str) -> str:
    """Obtém o nome RFC 5987/RFC 6266, priorizando ``filename*``.

    O Google Drive pode enviar simultaneamente ``filename=260817`` e um
    ``filename*=UTF-8''...`` com o nome completo e a extensão real.
    """

    extended = re.search(r"filename\*\s*=\s*([^;]+)", value, re.IGNORECASE)
    if extended:
        encoded = extended.group(1).strip().strip('"\'')
        if "''" in encoded:
            _, encoded = encoded.split("''", 1)
        decoded = unquote(encoded).strip()
        if decoded:
            return decoded

    double_quoted = re.search(r'filename\s*=\s*"([^"]+)"', value, re.IGNORECASE)
    if double_quoted:
        return double_quoted.group(1).strip()
    single_quoted = re.search(r"filename\s*=\s*'([^']+)'", value, re.IGNORECASE)
    if single_quoted:
        return single_quoted.group(1).strip()
    regular = re.search(r"filename\s*=\s*([^;]+)", value, re.IGNORECASE)
    return regular.group(1).strip() if regular else ""


def _message_body(message: Message) -> str:
    body = ""
    for part in message.walk():
        if part.get_content_type() in ("text/plain", "text/html"):
            payload = part.get_payload(decode=True)
            if payload:
                body += payload.decode(errors="ignore") + "\n"
    return body


def _google_drive_files_mapping(message: Message) -> dict[str, str]:
    import html as html_lib
    body = _message_body(message)
    mapping: dict[str, str] = {}
    # 1. Plain text pattern: filename immediately preceding the URL
    for fn, fid in re.findall(
        r"([^\n\r<>]+?\.(?:xlsb|xlsx|csv|zip))\s*<\s*https://drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)",
        body,
        re.IGNORECASE,
    ):
        clean_fn = fn.strip().strip("'\" ")
        if clean_fn and fid not in mapping:
            mapping[fid] = clean_fn

    # 2. HTML chip patterns
    for fid, fn in re.findall(
        r'href=["\']https://drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)[^"\']*["\'][^>]*aria-label=["\']([^"\']+)["\']',
        body,
        re.IGNORECASE,
    ):
        clean_fn = html_lib.unescape(fn).strip().strip("'\" ")
        if clean_fn and fid not in mapping:
            mapping[fid] = clean_fn

    # 3. Add any other drive IDs found without explicit names
    for fid in _google_drive_ids(message):
        if fid not in mapping:
            mapping[fid] = ""

    return mapping


def _google_drive_ids(message: Message) -> list[str]:
    return list(
        dict.fromkeys(
            re.findall(
                r"https://drive\.google\.com/(?:file/d/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)",
                _message_body(message),
            )
        )
    )


class EmailClient:
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
    def _download_google_drive_files(message: Message, destination: Path) -> int:
        import httpx

        files_map = _google_drive_files_mapping(message)
        if not files_map:
            return 0

        destination.mkdir(parents=True, exist_ok=True)
        downloaded = 0

        for index, (file_id, expected_name) in enumerate(files_map.items(), start=1):
            download_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"
            try:
                with httpx.Client(follow_redirects=True, timeout=180.0) as client:
                    response = client.get(download_url)
                    if response.status_code != 200 or len(response.content) < 100:
                        continue

                    # If Google Drive returns the HTML virus scan warning page, follow the form
                    if b"<html" in response.content.lower() and (
                        b"download-form" in response.content or b"download anyway" in response.content.lower()
                    ):
                        action_match = re.search(r'action="([^"]+)"', response.text)
                        action = action_match.group(1) if action_match else "https://drive.usercontent.google.com/download"
                        inputs = dict(re.findall(r'<input type="hidden" name="([^"]+)" value="([^"]+)"', response.text))
                        response = client.get(action, params=inputs)

                    # Se a resposta ainda for HTML, não é uma planilha válida
                    if b"<html" in response.content.lower() or b"<!doctype html" in response.content.lower():
                        continue

                    if response.status_code != 200 or len(response.content) < 100:
                        continue

                    # Extrair nome do arquivo: 1º Content-Disposition, 2º mapeamento do e-mail, 3º fallback
                    cd = response.headers.get("content-disposition", "")
                    header_name = content_disposition_filename(cd)
                    if header_name:
                        raw_name = header_name
                    elif expected_name:
                        raw_name = expected_name
                    else:
                        raw_name = f"drive_file_{index}.xlsx"

                    filename = safe_filename(raw_name)
                    path = destination / filename
                    path.write_bytes(response.content)
                    downloaded += 1
            except Exception:
                pass

        return downloaded

    @staticmethod
    def has_attachment_reference(message: Message) -> bool:
        """Distingue mensagem vazia de falha transitória ao baixar anexos."""

        has_mime_attachment = any(
            part.get_content_disposition() == "attachment"
            for part in message.walk()
        )
        return has_mime_attachment or bool(_google_drive_ids(message))

    @staticmethod
    def save_attachments(message: Message, destination: Path) -> int:
        parts = [part for part in message.walk() if part.get_content_disposition() == "attachment"]
        count = 0
        if parts:
            destination.mkdir(parents=True, exist_ok=True)
            for index, part in enumerate(parts, start=1):
                name = safe_filename(decode_text(part.get_filename()) or f"anexo_{index}")
                path = destination / name
                if path.exists():
                    path = destination / f"{path.stem}_{index}{path.suffix}"
                path.write_bytes(part.get_payload(decode=True) or b"")
                count += 1
        
        # Se não encontrou anexos padrão, busca links do Google Drive (anexos > 25MB)
        if count == 0:
            count += EmailClient._download_google_drive_files(message, destination)
            
        return count
