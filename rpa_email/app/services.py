from __future__ import annotations

import hashlib
import imaplib
import logging
import tempfile
from pathlib import Path
from datetime import timezone
from email.message import Message
from email.utils import parseaddr, parsedate_to_datetime

from rpa_email.app.models import (
    EmailRecord,
    ExecutionSummary,
)
from rpa_email.app.repository import ProcessingRepository
from rpa_email.app.ingestion_client import ReportSender, build_payload
from rpa_email.app.extractor import KpiExtractor
from rpa_email.config.settings import Settings
from rpa_email.modules.email.EmailHandler import (
    EmailHandler,
    decode_text,
)
from rpa_email.app.raw_file_bridge import RawFileBridge, is_raw_report


LOGGER = logging.getLogger(__name__)


class EmailProcessingService:
    def __init__(
        self,
        settings: Settings,
        repository: ProcessingRepository,
        handler: EmailHandler,
        report_sender: ReportSender,
    ):
        self.settings = settings
        self.repository = repository
        self.handler = handler
        self.report_sender = report_sender

    def _criteria(self) -> list[str]:
        """
        Monta os filtros usados diretamente pelo servidor IMAP.

        Dessa forma, a automação não precisa baixar todos os
        e-mails da caixa para depois aplicar os filtros.
        """

        criteria = ["ALL"]

        if self.settings.subject_filter:
            subject = self.settings.subject_filter.replace(
                '"',
                "",
            )

            criteria.extend(
                [
                    "SUBJECT",
                    f'"{subject}"',
                ]
            )

        if self.settings.sender_filter:
            sender = self.settings.sender_filter.replace(
                '"',
                "",
            )

            criteria.extend(
                [
                    "FROM",
                    f'"{sender}"',
                ]
            )

        if self.settings.date_from:
            criteria.extend(
                [
                    "SINCE",
                    self.settings.date_from.strftime(
                        "%d-%b-%Y"
                    ),
                ]
            )

        if self.settings.date_to:
            criteria.extend(
                [
                    "BEFORE",
                    self.settings.date_to.strftime(
                        "%d-%b-%Y"
                    ),
                ]
            )

        return criteria

    @staticmethod
    def _received_at(
        message: Message,
    ):
        """
        Converte a data do cabeçalho do e-mail para datetime.
        Retorna None caso a data esteja ausente ou inválida.
        """

        try:
            date_header = message.get("Date")

            if not date_header:
                return None

            return parsedate_to_datetime(
                date_header
            )

        except (
            TypeError,
            ValueError,
            OverflowError,
        ):
            return None

    @staticmethod
    def _key(
        message: Message,
        uid: str,
    ) -> str:
        """
        Cria uma chave única para impedir o processamento
        duplicado de um mesmo e-mail.
        """

        message_id = message.get(
            "Message-ID",
            "",
        ).strip()

        if message_id:
            return f"message-id:{message_id}"

        fingerprint_data = "|".join(
            [
                uid,
                message.get("From", ""),
                message.get("Date", ""),
                message.get("Subject", ""),
            ]
        )

        fingerprint = hashlib.sha256(
            fingerprint_data.encode("utf-8")
        ).hexdigest()

        return f"fingerprint:{fingerprint}"

    def _validate(
        self,
        message: Message,
    ) -> str | None:
        """
        Valida assunto, remetente e período.

        Mesmo com os filtros IMAP, esta validação adicional
        evita que mensagens fora do padrão sejam processadas.
        """

        subject = decode_text(
            message.get("Subject")
        )

        sender = parseaddr(
            message.get("From", "")
        )[1].lower()

        received_at = self._received_at(
            message
        )

        if received_at and received_at.tzinfo:
            comparable_date = (
                received_at
                .astimezone(timezone.utc)
                .replace(tzinfo=None)
            )
        else:
            comparable_date = received_at

        if (
            self.settings.subject_filter
            and self.settings.subject_filter.lower()
            not in subject.lower()
        ):
            return "assunto fora do padrão"

        if (
            self.settings.sender_filter
            and self.settings.sender_filter
            not in sender
        ):
            return "remetente fora do padrão"

        if (
            comparable_date
            and self.settings.date_from
            and comparable_date
            < self.settings.date_from
        ):
            return "data anterior ao período configurado"

        if (
            comparable_date
            and self.settings.date_to
            and comparable_date.date()
            > self.settings.date_to.date()
        ):
            return "data posterior ao período configurado"

        return None

    def _record(
        self,
        message: Message,
        uid: str,
        key: str,
        status: str,
        details: str,
        attachment_count: int = 0,
    ) -> None:
        """
        Cria o registro de histórico e envia ao Repository.
        """

        record = EmailRecord(
            dedup_key=key,
            message_id=message.get(
                "Message-ID",
                "",
            ),
            imap_uid=uid,
            sender=parseaddr(
                message.get("From", "")
            )[1],
            subject=decode_text(
                message.get("Subject")
            ),
            received_at=self._received_at(
                message
            ),
            status=status,
            details=details,
            attachment_count=attachment_count,
        )

        self.repository.save(record)

    def execute(
        self,
    ) -> ExecutionSummary:
        """
        Executa uma busca completa na caixa de e-mail.

        Cada execução:
        1. Conecta ao Gmail.
        2. Busca mensagens usando os filtros.
        3. Verifica duplicidade.
        4. Valida o padrão.
        5. Salva anexos.
        6. Registra o histórico.
        """

        summary = ExecutionSummary()
        client = self.handler.connect()

        try:
            criteria = self._criteria()

            LOGGER.info(
                "Iniciando busca IMAP com os filtros configurados"
            )

            uids = self.handler.search(
                client,
                criteria,
            )

            summary.found = len(uids)

            for raw_uid in uids:
                uid = raw_uid.decode()
                message = None

                key = (
                    f"imap-uid:"
                    f"{self.settings.mailbox}:"
                    f"{uid}"
                )

                try:
                    message = self.handler.fetch(
                        client,
                        raw_uid,
                    )

                    key = self._key(
                        message,
                        uid,
                    )

                    if self.repository.is_terminal(
                        key
                    ):
                        LOGGER.info(
                            "E-mail UID %s já foi processado",
                            uid,
                        )

                        summary.duplicated += 1
                        continue

                    validation_error = self._validate(
                        message
                    )

                    if validation_error:
                        self._record(
                            message=message,
                            uid=uid,
                            key=key,
                            status="FORA_DO_PADRAO",
                            details=validation_error,
                        )

                        LOGGER.warning(
                            "E-mail UID %s fora do padrão: %s",
                            uid,
                            validation_error,
                        )

                        summary.out_of_pattern += 1
                        continue

                    folder_hash = hashlib.sha256(
                        key.encode("utf-8")
                    ).hexdigest()[:16]

                    self.settings.attachments_dir.mkdir(parents=True, exist_ok=True)
                    # Cada tentativa usa pasta própria, sem misturar anexos anteriores.
                    attachment_folder = Path(tempfile.mkdtemp(
                        prefix=folder_hash + '-', dir=self.settings.attachments_dir.resolve()
                    ))
                    attachment_count = self.handler.save_attachments(message, attachment_folder)
                    if not attachment_count:
                        raise ValueError('Mensagem sem anexos')
                    if is_raw_report(attachment_folder):
                        extraction = RawFileBridge().process(attachment_folder)
                    else:
                        extraction = KpiExtractor(attachment_folder).extract()
                    payload = build_payload(
                        extraction,
                        message.get('Message-ID', '').strip() or key,
                        decode_text(message.get('Subject')),
                        parseaddr(message.get('From', ''))[1],
                    )
                    ingestion_status = self.report_sender.send(payload)
                    if ingestion_status not in ('processed', 'skipped'):
                        raise ValueError('Ingestao nao confirmada')

                    self._record(
                        message=message,
                        uid=uid,
                        key=key,
                        status="PROCESSADO",
                        details="Processado com sucesso",
                        attachment_count=attachment_count,
                    )

                    LOGGER.info(
                        (
                            "E-mail UID %s processado "
                            "com %s anexo(s)"
                        ),
                        uid,
                        attachment_count,
                    )

                    summary.processed += 1

                except Exception as exc:
                    LOGGER.exception(
                        "Erro ao processar o e-mail UID %s",
                        uid,
                    )

                    if message is not None:
                        try:
                            self._record(
                                message=message,
                                uid=uid,
                                key=key,
                                status="ERRO",
                                details=str(exc),
                            )

                        except Exception:
                            LOGGER.exception(
                                (
                                    "Não foi possível registrar "
                                    "o erro do UID %s"
                                ),
                                uid,
                            )

                    summary.errors += 1

        finally:
            try:
                client.logout()

            except imaplib.IMAP4.error:
                LOGGER.warning(
                    "A conexão IMAP já estava encerrada"
                )

        return summary
