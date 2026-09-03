"""HTTP real + PostgreSQL real, executados somente pelo Compose de testes.

Não usam overrides de dependências, mocks de repositório ou banco de produção.
"""
import os
import uuid

import bcrypt
import httpx
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


@pytest.fixture(scope='module')
def environment():
    database_url = os.environ.get('TEST_DATABASE_URL', '')
    api_url = os.environ.get('TEST_API_URL', '')
    # Falhar explicitamente; nunca cair em DATABASE_URL/.env ou ignorar a integração.
    if not database_url:
        pytest.fail('Execute com docker compose -f docker-compose.test.yml; falta TEST_DATABASE_URL')
    url = make_url(database_url)
    if url.host != 'postgres-test' or url.database != 'datalens_epico7_test' or api_url != 'http://api-test:5001':
        pytest.fail('Integração restrita ao ambiente Docker isolado do Épico 7')
    engine = create_engine(database_url)
    email = f'test-{uuid.uuid4().hex}@example.com'
    password = 'epico7-test-password'
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO roles (id, name) VALUES (:id, 'ADMIN') ON CONFLICT (name) DO NOTHING"), {'id': str(uuid.uuid4())})
        role_id = connection.scalar(text("SELECT id FROM roles WHERE name = 'ADMIN'"))
        connection.execute(text('INSERT INTO users (id, email, password_hash, role_id) VALUES (:id, :email, :hash, :role)'),
                           {'id': str(uuid.uuid4()), 'email': email, 'hash': bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(), 'role': role_id})
    with httpx.Client(base_url=api_url, timeout=10) as client:
        response = client.post('/api/auth/login', json={'email': email, 'password': password})
        assert response.status_code == 200, response.text
        client.headers['Authorization'] = 'Bearer ' + response.json()['access_token']
        yield client, engine
    engine.dispose()


def report(month='Jan', result=0.05):
    return {'email': {'message_id': f'<{uuid.uuid4().hex}@example.com>', 'subject': 'KPI test', 'sender': 'test@example.com'},
            'records': [{'kpi_type': 'logistic_cost', 'month': month, 'year': 'Y26', 'target': 0.04, 'result': result, 'achievement': 0.8}]}


def test_ingestion_read_duplicate_and_update(environment):
    client, engine = environment
    payload = report()
    response = client.post('/api/ingestion/kpi-report', json=payload)
    assert response.status_code == 200, response.text
    assert response.json()['status'] == 'processed'
    response = client.get('/api/kpis/logistic_cost', params={'month': 'Jan', 'year': 'Y26'})
    assert response.status_code == 200
    assert response.json() == [{'month': 'Jan', 'year': 'Y26', 'target': 0.04, 'result': 0.05, 'achievement': 0.8}]
    assert client.post('/api/ingestion/kpi-report', json=payload).json()['status'] == 'skipped'
    corrected = report(result=0.03)
    assert client.post('/api/ingestion/kpi-report', json=corrected).json()['status'] == 'processed'
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT result FROM kpi_logistic_cost WHERE month='Jan' AND year='Y26'")).all()
        assert len(rows) == 1
        assert float(rows[0].result) == 0.03
        count = connection.scalar(text('SELECT count(*) FROM processed_emails WHERE message_id=:id'), {'id': payload['email']['message_id']})
        assert count == 1


def test_invalid_batch_rolls_back_and_can_be_retried(environment):
    client, engine = environment
    payload = report(month='Feb')
    payload['records'].append({**payload['records'][0], 'kpi_type': 'unknown'})
    response = client.post('/api/ingestion/kpi-report', json=payload)
    assert response.status_code == 422
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM kpi_logistic_cost WHERE month='Feb' AND year='Y26'")) == 0
        assert connection.scalar(text('SELECT count(*) FROM processed_emails WHERE message_id=:id'), {'id': payload['email']['message_id']}) == 0
    payload['records'].pop()
    response = client.post('/api/ingestion/kpi-report', json=payload)
    assert response.status_code == 200
    assert response.json()['status'] == 'processed'


def test_missing_field_is_rejected_before_persistence(environment):
    client, engine = environment
    payload = report(month='Mar')
    del payload['records'][0]['result']
    assert client.post('/api/ingestion/kpi-report', json=payload).status_code == 422
    with engine.connect() as connection:
        assert connection.scalar(text('SELECT count(*) FROM processed_emails WHERE message_id=:id'), {'id': payload['email']['message_id']}) == 0


@pytest.mark.parametrize('change', [
    {'month': 'January'}, {'year': '2026'}, {'target': -0.01},
    {'result': 'NaN'}, {'result': 'Infinity'},
])
def test_invalid_values_are_rejected_atomically(environment, change):
    client, engine = environment
    payload = report(month='Mar')
    payload['records'][0].update(change)
    response = client.post('/api/ingestion/kpi-report', json=payload)
    assert response.status_code == 422, response.text
    with engine.connect() as connection:
        assert connection.scalar(
            text('SELECT count(*) FROM processed_emails WHERE message_id=:id'),
            {'id': payload['email']['message_id']},
        ) == 0


def test_empty_payload_is_rejected_before_history(environment):
    client, engine = environment
    payload = report()
    payload['records'] = []
    response = client.post('/api/ingestion/kpi-report', json=payload)
    assert response.status_code == 422, response.text
    with engine.connect() as connection:
        assert connection.scalar(
            text('SELECT count(*) FROM processed_emails WHERE message_id=:id'),
            {'id': payload['email']['message_id']},
        ) == 0


def test_unauthenticated_http_access_is_denied(environment):
    client, _ = environment
    response = client.get('/api/kpis/logistic_cost', headers={'Authorization': ''})
    assert response.status_code == 401


def test_synthetic_email_through_bot_to_real_api(environment, tmp_path):
    from email.message import EmailMessage
    from io import BytesIO
    from unittest.mock import Mock
    from openpyxl import Workbook
    from rpa_email.services.api_client import ApiReportSender
    from rpa_email.services.processing_history import SqliteProcessingRepository
    from rpa_email.email_service import EmailProcessingService
    from rpa_email.config.settings import Settings
    from rpa_email.email_client import EmailClient

    client, engine = environment
    bot_email = f'bot-{uuid.uuid4().hex}@example.com'
    password = 'synthetic-test-password'
    response = client.post('/api/users', json={'email': bot_email, 'password': password, 'role_name': 'ADMIN'})
    assert response.status_code == 201
    workbook = Workbook()
    workbook.active.append(['month', 'year', 'target', 'result', 'achievement'])
    workbook.active.append(['Apr', 'Y26', 0.04, 0.05, 0.8])
    data = BytesIO()
    workbook.save(data)
    workbook.close()
    message = EmailMessage()
    message['Subject'] = 'KPI TEST'
    message['From'] = 'synthetic@example.com'
    message['Message-ID'] = f'<{uuid.uuid4().hex}@example.com>'
    message.set_content('Synthetic test')
    message.add_attachment(data.getvalue(), maintype='application', subtype='octet-stream', filename='logistic_cost.xlsx')
    handler = Mock()
    handler.search.return_value = [b'1']
    handler.fetch.return_value = message
    handler.save_attachments.side_effect = EmailClient.save_attachments
    settings = Settings('not-used', 993, 'INBOX', '', '', 'KPI TEST', '', None, None, tmp_path / 'attachments')
    repository = SqliteProcessingRepository(str(tmp_path / 'history.db'))
    repository.initialize()
    sender = ApiReportSender(str(client.base_url), bot_email, password)
    service = EmailProcessingService(settings, repository, handler, sender)
    result = service.execute()
    assert (result.processed, result.errors) == (1, 0)
    assert service.execute().duplicated == 1
    # Histórico novo simula perda local: a API ainda impede duplicidade.
    second_history = SqliteProcessingRepository(str(tmp_path / 'second.db'))
    second_history.initialize()
    assert EmailProcessingService(settings, second_history, handler, sender).execute().processed == 1
    response = client.get('/api/kpis/logistic_cost', params={'month': 'Apr', 'year': 'Y26'})
    assert response.status_code == 200
    assert response.json() == [{'month': 'Apr', 'year': 'Y26', 'target': 0.04, 'result': 0.05, 'achievement': 0.8}]
    with engine.connect() as connection:
        assert connection.scalar(text('SELECT count(*) FROM processed_emails WHERE message_id=:id'), {'id': str(message['Message-ID'])}) == 1
