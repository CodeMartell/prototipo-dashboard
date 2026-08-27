"""Valida o serviço completo do robô no Gmail e na homologação local."""
from __future__ import annotations

import imaplib
import math
import sys
import tempfile
from dataclasses import replace
from email import message_from_bytes, policy
from pathlib import Path

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from rpa_email.app.ingestion_client import ApiReportSender
from rpa_email.app.repository import SqliteProcessingRepository
from rpa_email.app.services import EmailProcessingService
from rpa_email.config.settings import Settings
from rpa_email.modules.email.EmailHandler import EmailHandler

SUBJECT = "Relatorio Logistico - TESTE EPICO 7"
API_URL = "http://127.0.0.1:15001"


class ExactTestMessageHandler(EmailHandler):
    """Restringe o serviço real a uma única mensagem sintética conhecida."""

    @staticmethod
    def search(client: imaplib.IMAP4_SSL, criteria: list[str]) -> list[bytes]:
        status, data = client.uid("search", None, "SUBJECT", f'"{SUBJECT}"')
        if status != "OK":
            raise ConnectionError("Falha ao buscar a mensagem de teste")
        candidates = data[0].split()[-10:] if data and data[0] else []
        for uid in reversed(candidates):
            status, parts = client.uid("fetch", uid, "(BODY.PEEK[HEADER.FIELDS (SUBJECT)])")
            headers = next((part[1] for part in parts if isinstance(part, tuple)), None)
            if status == "OK" and headers:
                subject = str(message_from_bytes(headers, policy=policy.default).get("Subject", "")).strip()
                if subject == SUBJECT:
                    return [uid]
        return []

    @staticmethod
    def fetch(client: imaplib.IMAP4_SSL, uid: bytes):
        message = EmailHandler.fetch(client, uid)
        filenames = [part.get_filename() for part in message.walk()
                     if part.get_content_disposition() == "attachment"]
        if str(message.get("Subject", "")).strip() != SUBJECT:
            raise ValueError("Assunto exato divergente")
        if filenames != ["logistic_cost.xlsx"]:
            raise ValueError("Esperado somente o anexo logistic_cost.xlsx")
        if not str(message.get("Message-ID", "")).strip():
            raise ValueError("Message-ID ausente")
        return message


def _settings() -> Settings:
    gmail = dotenv_values(ROOT / ".env")
    homologation = dotenv_values(ROOT / ".env.homologacao")
    values = {
        "email_user": gmail.get("EMAIL_USER"),
        "email_password": gmail.get("EMAIL_PASSWORD"),
        "api_email": homologation.get("RPA_API_EMAIL"),
        "api_password": homologation.get("RPA_API_PASSWORD"),
    }
    if any(not value for value in values.values()):
        raise ValueError("Credenciais de teste incompletas")
    base = Settings(
        imap_host="imap.gmail.com", imap_port=993, mailbox="INBOX",
        email_user=str(values["email_user"]), email_password=str(values["email_password"]),
        subject_filter=SUBJECT, sender_filter="", date_from=None, date_to=None,
        database_url="", api_url=API_URL, api_email=str(values["api_email"]),
        api_password=str(values["api_password"]), api_timeout=20,
        attachments_dir=ROOT / "rpa_email/resources/attachments/full-bot-validation",
    )
    history_dir = ROOT / "rpa_email/resources/history-validation"
    history_dir.mkdir(parents=True, exist_ok=True)
    history = tempfile.NamedTemporaryFile(prefix="full-bot-", suffix=".db", dir=history_dir, delete=False)
    history.close()
    return replace(base, processing_history_path=Path(history.name))


def _verify_api(config: Settings, check_data: bool = True) -> None:
    with httpx.Client(base_url=API_URL, timeout=20, trust_env=False) as client:
        health = client.get("/api/health")
        health.raise_for_status()
        if health.json().get("environment") != "homologacao-local":
            raise ValueError("Destino não é a homologação local")
        login = client.post("/api/auth/login", json={"email": config.api_email, "password": config.api_password})
        login.raise_for_status()
        if not check_data:
            return
        response = client.get(
            "/api/kpis/logistic_cost", params={"month": "Jan", "year": "Y26"},
            headers={"Authorization": "Bearer " + login.json()["access_token"]},
        )
        response.raise_for_status()
        rows = response.json()
        if len(rows) != 1:
            raise ValueError("Quantidade de registros inesperada na API")
        row = rows[0]
        if (row.get("month"), row.get("year")) != ("Jan", "Y26") or not all(
            math.isclose(float(row[name]), expected, abs_tol=1e-9)
            for name, expected in (("target", 0.04), ("result", 0.05), ("achievement", 0.8))
        ):
            raise ValueError("Valores da API divergentes")


def main() -> int:
    try:
        print("Validando destino e credenciais da API local...", flush=True)
        settings = _settings()
        _verify_api(settings, check_data=False)
        repository = SqliteProcessingRepository(str(settings.processing_history_path))
        repository.initialize()
        handler = ExactTestMessageHandler(settings.imap_host, settings.imap_port,
                                          settings.email_user, settings.email_password, settings.mailbox)
        sender = ApiReportSender(settings.api_url, settings.api_email,
                                 settings.api_password, settings.api_timeout)
        service = EmailProcessingService(settings, repository, handler, sender)

        print("Executando o ciclo completo do robô pela primeira vez...", flush=True)
        first = service.execute()
        print("Reexecutando com o mesmo histórico para testar duplicidade...", flush=True)
        second = service.execute()
        _verify_api(settings)
        if (first.found, first.processed, first.errors) != (1, 1, 0):
            raise ValueError("Primeira execução não processou exatamente uma mensagem")
        if (second.found, second.duplicated, second.processed, second.errors) != (1, 1, 0, 0):
            raise ValueError("Histórico local não bloqueou a duplicidade")

        print("APROVADO: Gmail -> serviço completo -> extrator -> API -> histórico local.")
        print("Primeira execução: encontrados=1, processados=1, erros=0.")
        print("Segunda execução: encontrados=1, duplicados=1, processados=0, erros=0.")
        print("API: Jan/Y26 target=0.04 result=0.05 achievement=0.8.")
        print("Mensagem preservada; destino restrito à homologação local.")
        print("Histórico: " + str(settings.processing_history_path.relative_to(ROOT)))
        return 0
    except KeyboardInterrupt:
        print("\nCANCELADO: repita o teste; a API impedirá duplicidade pelo Message-ID.")
        return 130
    except Exception as error:
        print("FALHA: " + type(error).__name__ + ". Confira Gmail, Docker e os arquivos .env locais.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
