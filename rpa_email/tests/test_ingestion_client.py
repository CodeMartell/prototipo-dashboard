import json
from email.message import EmailMessage
from unittest.mock import Mock

import httpx
import pytest

from rpa_email.app.ingestion_client import ApiReportSender, IngestionError
from rpa_email.app.services import EmailProcessingService
from rpa_email.app.extractor import ExtractionResult, KpiMonthlyRow
from rpa_email.config.settings import Settings
from rpa_email.tests.unit_tests import MemoryRepository


@pytest.mark.parametrize('status', ['processed', 'skipped'])
def test_sender_authenticates_and_confirms(status):
    calls = []
    def respond(request):
        calls.append(request)
        if request.url.path.endswith('/login'):
            assert json.loads(request.content) == {'email': 'bot@example.com', 'password': 'secret'}
            return httpx.Response(200, json={'access_token': 'test-token'})
        assert request.headers['Authorization'] == 'Bearer test-token'
        assert json.loads(request.content) == {'test': True}
        return httpx.Response(200, json={'status': status})
    sender = ApiReportSender('http://api-test:5001', 'bot@example.com', 'secret', transport=httpx.MockTransport(respond))
    assert sender.send({'test': True}) == status
    assert len(calls) == 2


@pytest.mark.parametrize('failure', ['401', '403', '422', '500', 'timeout', 'connection', 'malformed', 'unknown'])
def test_sender_rejects_failures_without_exposing_secrets(failure):
    def respond(request):
        if failure == '401':
            return httpx.Response(401, text='secret')
        if request.url.path.endswith('/login'):
            return httpx.Response(200, json={'access_token': 'secret'})
        if failure == 'timeout':
            raise httpx.ReadTimeout('secret')
        if failure == 'connection':
            raise httpx.ConnectError('secret')
        if failure == 'malformed':
            return httpx.Response(200, text='secret')
        if failure == 'unknown':
            return httpx.Response(200, json={'status': 'pending'})
        return httpx.Response(int(failure), text='secret')
    sender = ApiReportSender('http://api-test:5001', 'bot@example.com', 'secret', transport=httpx.MockTransport(respond))
    with pytest.raises(IngestionError) as error:
        sender.send({})
    assert 'secret' not in str(error.value)


def service_setup(tmp_path, monkeypatch):
    settings = Settings('test', 993, 'INBOX', 'test', 'test', 'KPI', '', None, None, '', tmp_path)
    handler = Mock()
    message = EmailMessage()
    message['Subject'] = 'KPI'
    message['From'] = 'test@example.com'
    message['Message-ID'] = '<synthetic@example.com>'
    handler.search.return_value = [b'1']
    handler.fetch.return_value = message
    handler.save_attachments.return_value = 1
    extraction = ExtractionResult(logistic_cost=[KpiMonthlyRow('Jan', 'Y26', 0.04, 0.05, 0.8, 'logistic_cost')])
    monkeypatch.setattr('rpa_email.app.services.KpiExtractor.extract', lambda self: extraction)
    repository, sender = MemoryRepository(), Mock()
    sender.send.return_value = 'processed'
    return EmailProcessingService(settings, repository, handler, sender), repository, sender, extraction


def test_failed_send_can_retry_then_skips_locally(tmp_path, monkeypatch):
    service, repository, sender, _ = service_setup(tmp_path, monkeypatch)
    sender.send.side_effect = [IngestionError('API indisponivel'), 'skipped']
    first = service.execute()
    assert (first.processed, first.errors) == (0, 1)
    assert not repository.is_terminal('message-id:<synthetic@example.com>')
    assert service.execute().processed == 1
    assert service.execute().duplicated == 1
    assert sender.send.call_count == 2
    assert sender.send.call_args_list[0] == sender.send.call_args_list[1]
    folders = [call.args[1] for call in service.handler.save_attachments.call_args_list]
    assert folders[0] != folders[1]


@pytest.mark.parametrize('failure', ['no-attachment', 'corrupt', 'empty', 'unconfirmed'])
def test_invalid_input_never_marks_success(tmp_path, monkeypatch, failure):
    service, repository, sender, extraction = service_setup(tmp_path, monkeypatch)
    if failure == 'no-attachment':
        service.handler.save_attachments.return_value = 0
    elif failure == 'corrupt':
        extraction.errors.append('corrupt')
    elif failure == 'empty':
        extraction.logistic_cost.clear()
    else:
        sender.send.return_value = 'pending'
    result = service.execute()
    assert (result.errors, result.processed) == (1, 0)
    assert not repository.is_terminal('message-id:<synthetic@example.com>')
    if failure != 'unconfirmed':
        sender.send.assert_not_called()


@pytest.mark.parametrize('url,message_id', [('https://other.example.com', '<test@example.com>'), ('http://127.0.0.1:15001', '')])
def test_controlled_ingestion_blocks_wrong_destination_or_missing_id(monkeypatch, url, message_id):
    from scripts import ingest_validated_test as validation
    monkeypatch.setattr(validation, 'dotenv_values', lambda path: {'RPA_API_URL': url})
    transport = Mock()
    monkeypatch.setattr(validation.httpx, 'Client', transport)
    message = EmailMessage()
    if message_id:
        message['Message-ID'] = message_id
    with pytest.raises(ValueError):
        validation.ingest_and_verify(message, ExtractionResult())
    transport.assert_not_called()
