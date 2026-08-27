"""Envia exclusivamente o relatório sintético validado ao ambiente local fixo."""
from pathlib import Path
from email.utils import parseaddr
import httpx
from dotenv import dotenv_values
from rpa_email.app.ingestion_client import ApiReportSender, build_payload

ROOT = Path(__file__).resolve().parents[1]
API_URL = 'http://127.0.0.1:15001'


def ingest_and_verify(message, extraction):
    config = dotenv_values(ROOT / '.env.homologacao')
    if config.get('RPA_API_URL') != API_URL:
        raise ValueError('Configure apenas a API de homologacao local')
    message_id = str(message.get('Message-ID', '')).strip()
    if not message_id:
        raise ValueError('Message-ID ausente; envio bloqueado')
    with httpx.Client(base_url=API_URL, timeout=20, trust_env=False) as client:
        health = client.get('/api/health')
        health.raise_for_status()
        if health.json().get('environment') != 'homologacao-local':
            raise ValueError('Ambiente incorreto; envio bloqueado')
        sender = ApiReportSender(API_URL, config.get('RPA_API_EMAIL', ''), config.get('RPA_API_PASSWORD', ''))
        payload = build_payload(extraction, message_id, str(message['Subject']), parseaddr(message.get('From', ''))[1])
        first_status = sender.send(payload)
        second_status = sender.send(payload)
        if second_status != 'skipped':
            raise ValueError('API nao confirmou deduplicacao')
        response = client.post('/api/auth/login', json={'email': config['RPA_API_EMAIL'], 'password': config['RPA_API_PASSWORD']})
        response.raise_for_status()
        response = client.get('/api/kpis/logistic_cost', params={'month': 'Jan', 'year': 'Y26'},
                              headers={'Authorization': 'Bearer ' + response.json()['access_token']})
        response.raise_for_status()
        expected = [{'month': 'Jan', 'year': 'Y26', 'target': 0.04, 'result': 0.05, 'achievement': 0.8}]
        if response.json() != expected:
            raise ValueError('Valores consultados na API divergem da referencia')
    print(f'API APROVADA: primeiro envio={first_status}; repeticao=skipped; valores persistidos conferidos.')
