from email.message import EmailMessage
from pathlib import Path

from rpa_email.app.models import EmailRecord
from rpa_email.app.repository import ProcessingRepository
from rpa_email.modules.email.EmailHandler import EmailHandler, decode_text, safe_filename


class MemoryRepository(ProcessingRepository):
    def __init__(self): self.records = {}
    def initialize(self): pass
    def is_terminal(self, key):
        item = self.records.get(key)
        return bool(item and item.status in {"PROCESSADO", "FORA_DO_PADRAO"})
    def save(self, record: EmailRecord): self.records[record.dedup_key] = record


def test_repository_prevents_terminal_duplicate():
    repository = MemoryRepository()
    record = EmailRecord("key", "id", "1", "a@b.com", "Relatorio", None, "PROCESSADO")
    repository.save(record)
    assert repository.is_terminal("key")


def test_error_can_be_retried():
    repository = MemoryRepository()
    repository.save(EmailRecord("key", "id", "1", "a@b.com", "Relatorio", None, "ERRO"))
    assert not repository.is_terminal("key")


def test_safe_filename_blocks_directory_traversal():
    assert safe_filename("../../segredo?.pdf") == "segredo_.pdf"


def test_attachment_is_saved(tmp_path: Path):
    message = EmailMessage()
    message.set_content("Corpo")
    message.add_attachment(b"conteudo", maintype="application", subtype="pdf", filename="arquivo.pdf")
    assert EmailHandler.save_attachments(message, tmp_path) == 1
    assert (tmp_path / "arquivo.pdf").read_bytes() == b"conteudo"


def test_encoded_subject():
    assert decode_text("=?utf-8?q?Relat=C3=B3rio_Log=C3=ADstico?=") == "Relatório Logístico"
