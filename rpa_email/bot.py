import logging

from rpa_email.app.controller import EmailAutomationController
from rpa_email.app.repository import SqliteProcessingRepository
from rpa_email.app.ingestion_client import ApiReportSender
from rpa_email.app.services import EmailProcessingService
from rpa_email.config.settings import Settings
from rpa_email.modules.email.EmailHandler import EmailHandler


def build_controller() -> EmailAutomationController:
    settings = Settings.from_env()
    # Histórico novo: não reutilizar PROCESSADO do fluxo legado que ocultava falhas.
    repository = SqliteProcessingRepository(str(settings.processing_history_path))
    settings.processing_history_path.parent.mkdir(parents=True, exist_ok=True)
    repository.initialize()
    handler = EmailHandler(
        settings.imap_host, settings.imap_port, settings.email_user,
        settings.email_password, settings.mailbox,
    )
    sender = ApiReportSender(settings.api_url, settings.api_email, settings.api_password, settings.api_timeout)
    return EmailAutomationController(EmailProcessingService(settings, repository, handler, sender))



def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    return build_controller().run()


if __name__ == "__main__":
    raise SystemExit(main())
