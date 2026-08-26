import logging

from rpa_email.app.services import EmailProcessingService


class EmailAutomationController:
    """Coordena uma execucao, sem conter regra de negocio ou acesso a dados."""

    def __init__(self, service: EmailProcessingService):
        self._service = service

    def run(self) -> int:
        result = self._service.execute()
        logging.info(
            "Execucao concluida | encontrados=%s processados=%s duplicados=%s fora_do_padrao=%s erros=%s",
            result.found, result.processed, result.duplicated,
            result.out_of_pattern, result.errors,
        )
        return 1 if result.errors else 0
