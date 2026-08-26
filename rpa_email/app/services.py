from __future__ import annotations

import hashlib
import imaplib
import logging
from datetime import timezone
from email.message import Message
from email.utils import parseaddr, parsedate_to_datetime

from rpa_email.app.models import (
    EmailRecord,
    ExecutionSummary,
)
from rpa_email.app.repository import ProcessingRepository
from rpa_email.config.settings import Settings
from rpa_email.modules.email.EmailHandler import (
    EmailHandler,
    decode_text,
)


LOGGER = logging.getLogger(__name__)


class EmailProcessingService:
    def __init__(
        self,
        settings: Settings,
        repository: ProcessingRepository,
        handler: EmailHandler,
    ):
        self.settings = settings
        self.repository = repository
        self.handler = handler

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

                    attachment_folder = (
                        self.settings.attachments_dir
                        / folder_hash
                    )

                    attachment_count = (
                        self.handler.save_attachments(
                            message,
                            attachment_folder,
                        )
                    )

                    if attachment_count > 0:
                        try:
                            from rpa_email.app.extractor import KpiExtractor
                            from rpa_email.app.kpi_repository import KpiPostgresRepository
                            extractor = KpiExtractor(attachment_folder)
                            ext_res = extractor.extract()

                            # 1. Tenta gravar no PostgreSQL
                            try:
                                kpi_repo = KpiPostgresRepository(self.settings.database_url)
                                kpi_repo.initialize()
                                kpi_map = {
                                    "logistic_cost": ext_res.logistic_cost,
                                    "air_freight": ext_res.air_freight,
                                    "incidental_cost": ext_res.incidental_cost,
                                    "total_cost": ext_res.total_cost,
                                    "demurrage": ext_res.demurrage,
                                }
                                for kpi_k, rows in kpi_map.items():
                                    if rows:
                                        kpi_repo.upsert_standard_kpi(kpi_k, rows)
                                if ext_res.logistics_vs_prod:
                                    kpi_repo.upsert_logistics_vs_prod(ext_res.logistics_vs_prod)
                                LOGGER.info("[DB] KPIs persistidos no PostgreSQL com sucesso.")
                            except Exception as db_err:
                                LOGGER.warning("[DB] PostgreSQL indisponivel (%s). Atualizando cache local...", db_err)

                            # 2. Atualiza cache local dados_dashboard.xlsx
                            try:
                                from rpa_email.bot_local import _write_excel_cache
                                from pathlib import Path
                                root_project = Path(__file__).resolve().parents[2]
                                excel_path = root_project / "dados_dashboard.xlsx"
                                cache_dict = {
                                    "logistic_cost": [
                                        {"month": r.month, "year": r.year, "target": r.target, "result": r.result, "achievement": r.achievement}
                                        for r in ext_res.logistic_cost
                                    ],
                                    "air_freight": [
                                        {"month": r.month, "year": r.year, "target": r.target, "result": r.result, "achievement": r.achievement}
                                        for r in ext_res.air_freight
                                    ],
                                    "incidental_cost": [
                                        {"month": r.month, "year": r.year, "target": r.target, "result": r.result, "achievement": r.achievement}
                                        for r in ext_res.incidental_cost
                                    ],
                                    "total_cost": [
                                        {"month": r.month, "year": r.year, "target": r.target, "result": r.result, "achievement": r.achievement}
                                        for r in ext_res.total_cost
                                    ],
                                    "demurrage": [
                                        {"month": r.month, "year": r.year, "target": r.target, "result": r.result, "achievement": r.achievement}
                                        for r in ext_res.demurrage
                                    ],
                                    "logistics_vs_prod": [
                                        {"month": r.month, "year": r.year, "logisticsCost": r.logistics_cost, "productionAmount": r.production_amount, "ratio": r.ratio}
                                        for r in ext_res.logistics_vs_prod
                                    ],
                                }
                                _write_excel_cache(cache_dict, excel_path)
                                LOGGER.info("[EXCEL] Cache local dados_dashboard.xlsx atualizado com sucesso.")
                            except Exception as xlsx_err:
                                LOGGER.warning("[EXCEL] Nao foi possivel atualizar o cache Excel: %s", xlsx_err)

                        except Exception as kpi_exc:
                            LOGGER.warning("Nao foi possivel extrair/persistir KPIs dos anexos: %s", kpi_exc)

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