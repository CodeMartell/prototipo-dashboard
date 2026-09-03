import logging

from rpa_email.services.processing_history import SqliteProcessingRepository
from rpa_email.services.api_client import ApiReportSender
from rpa_email.email_service import EmailProcessingService
from rpa_email.config.settings import Settings
from rpa_email.email_client import EmailClient


def build_service() -> EmailProcessingService:
    settings = Settings.from_env()
    # Histórico novo: não reutilizar PROCESSADO do fluxo legado que ocultava falhas.
    repository = SqliteProcessingRepository(str(settings.processing_history_path))
    settings.processing_history_path.parent.mkdir(parents=True, exist_ok=True)
    repository.initialize()
    handler = EmailClient(
        settings.imap_host, settings.imap_port, settings.email_user,
        settings.email_password, settings.mailbox,
    )
    sender = ApiReportSender(settings.api_url, settings.api_email, settings.api_password, settings.api_timeout)
    return EmailProcessingService(settings, repository, handler, sender)



def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    result = build_service().execute()
    logging.info(
        "Execucao concluida | encontrados=%s processados=%s duplicados=%s fora_do_padrao=%s erros=%s",
        result.found, result.processed, result.duplicated,
        result.out_of_pattern, result.errors,
    )
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
