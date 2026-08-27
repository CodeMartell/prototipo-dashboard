"""Transporte HTTP da ingestão; sem SQL e sem registrar credenciais/respostas."""
from dataclasses import asdict
from typing import Protocol

import httpx


class ReportSender(Protocol):
    def send(self, payload: dict) -> str: ...


class IngestionError(RuntimeError):
    pass


def build_payload(extraction, message_id: str, subject: str, sender: str) -> dict:
    if extraction.errors:
        raise IngestionError('Falha na extracao; nenhum dado enviado')
    records = []
    for key in ('logistic_cost', 'air_freight', 'incidental_cost', 'total_cost', 'demurrage'):
        for row in getattr(extraction, key):
            values = asdict(row)
            values.pop('kpi_key')
            records.append({'kpi_type': key, **values})
    extra = [asdict(row) for row in extraction.logistics_vs_prod]
    if not records and not extra:
        raise IngestionError('Nenhum registro valido extraido')
    return {'email': {'message_id': message_id, 'subject': subject, 'sender': sender},
            'records': records, 'logistics_vs_prod': extra}


class ApiReportSender:
    def __init__(self, base_url: str, email: str, password: str, timeout: float = 20, transport=None):
        url = httpx.URL(base_url)
        if url.scheme not in ('http', 'https') or not url.host or url.userinfo or url.query or url.fragment:
            raise ValueError('RPA_API_URL deve ser uma URL HTTP(S) sem credenciais, query ou fragmento')
        if not email or not password or timeout <= 0:
            raise ValueError('Configure credenciais da API e timeout positivo')
        self.base_url, self.email, self.password = base_url.rstrip('/'), email, password
        self.timeout, self.transport = timeout, transport

    def send(self, payload: dict) -> str:
        # Nova autenticação por envio evita reutilizar JWT expirado. Sem retries
        # automáticos: a próxima execução reenvia o MESMO Message-ID com segurança.
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport, follow_redirects=False) as client:
                login = client.post(self.base_url + '/api/auth/login', json={'email': self.email, 'password': self.password})
                if login.status_code != 200:
                    raise IngestionError(f'Autenticacao da API rejeitada (HTTP {login.status_code})')
                token = login.json().get('access_token')
                if not isinstance(token, str) or not token.strip():
                    raise IngestionError('Resposta de autenticacao invalida')
                response = client.post(self.base_url + '/api/ingestion/kpi-report', json=payload,
                                       headers={'Authorization': f'Bearer {token}'})
                if response.status_code != 200:
                    raise IngestionError(f'Ingestao rejeitada (HTTP {response.status_code})')
                status = response.json().get('status')
                if status not in ('processed', 'skipped'):
                    raise IngestionError('API nao confirmou a ingestao')
                return status
        except httpx.TimeoutException:
            raise IngestionError('Tempo limite na API; confirmar resultado no reprocessamento') from None
        except httpx.RequestError:
            raise IngestionError('API indisponivel; reprocessamento necessario') from None
        except (ValueError, AttributeError):
            raise IngestionError('Resposta JSON invalida da API') from None
