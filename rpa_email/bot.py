import logging

from rpa_email.app.controller import EmailAutomationController
from rpa_email.app.repository import PostgresProcessingRepository
from rpa_email.app.services import EmailProcessingService
from rpa_email.config.settings import Settings
from rpa_email.modules.email.EmailHandler import EmailHandler


def build_controller() -> EmailAutomationController:
    settings = Settings.from_env()
    repository = PostgresProcessingRepository(settings.database_url)
    repository.initialize()
    handler = EmailHandler(
        settings.imap_host, settings.imap_port, settings.email_user,
        settings.email_password, settings.mailbox,
    )
    return EmailAutomationController(EmailProcessingService(settings, repository, handler))


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    return build_controller().run()


if __name__ == "__main__":
    raise SystemExit(main())
