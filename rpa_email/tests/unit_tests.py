from email.message import EmailMessage
from pathlib import Path
from unittest.mock import Mock

import pytest

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


@pytest.mark.parametrize('error,code,message', [
    (KeyboardInterrupt(), 130, 'CANCELADO'),
    (TimeoutError(), 8, 'TEMPO_LIMITE'),
])
def test_gmail_validation_handles_interrupted_fetch(monkeypatch, capsys, error, code, message):
    import logging
    from scripts import validate_gmail_test as validator

    previous_level = logging.root.manager.disable
    monkeypatch.setattr(validator, 'dotenv_values', lambda path: {'EMAIL_USER': 'test@example.com', 'EMAIL_PASSWORD': 'secret-test'})
    client = Mock()
    client.select.return_value = ('OK', [])
    client.uid.side_effect = [('OK', [b'1']), error]
    monkeypatch.setattr(validator.imaplib, 'IMAP4_SSL', Mock(return_value=client))
    assert validator.main() == code
    client.select.assert_called_once_with('INBOX', readonly=True)
    client.shutdown.assert_called_once()
    client.logout.assert_not_called()
    output = capsys.readouterr().out
    assert message in output
    assert 'secret-test' not in output
    assert 'test@example.com' not in output
    assert logging.root.manager.disable == previous_level


def test_imap_connect_selects_read_only_mailbox(monkeypatch):
    client = Mock()
    client.select.return_value = ("OK", [b"1"])
    factory = Mock(return_value=client)
    monkeypatch.setattr("imaplib.IMAP4_SSL", factory)
    handler = EmailHandler("imap.example.com", 993, "test@example.com", "test-password", "INBOX")
    assert handler.connect() is client
    factory.assert_called_once_with("imap.example.com", 993)
    client.login.assert_called_once_with("test@example.com", "test-password")
    client.select.assert_called_once_with("INBOX", readonly=True)


def test_imap_search_and_fetch():
    message = EmailMessage()
    message["Subject"] = "Relatório KPI"
    message.set_content("Teste")
    client = Mock()
    client.uid.side_effect = [("OK", [b"1 2"]), ("OK", [(b"1", message.as_bytes())])]
    assert EmailHandler.search(client, ["ALL"]) == [b"1", b"2"]
    assert EmailHandler.fetch(client, b"1")["Subject"] == "Relatório KPI"
    assert client.uid.call_args.args == ("fetch", b"1", "(RFC822)")


def test_imap_search_failure():
    client = Mock()
    client.uid.return_value = ("NO", [])
    with pytest.raises(ConnectionError):
        EmailHandler.search(client, ["ALL"])
