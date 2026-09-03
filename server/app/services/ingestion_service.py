"""
app/services/ingestion_service.py
Recebe os dados já extraídos pelo bot (Épico 2/3) via HTTP e persiste
no banco (upsert — reenviar o mesmo mês/ano atualiza, não duplica).
"""
import uuid

from app.core.exceptions import DomainError
from app.models.kpi import KPI_MODEL_MAP
from app.models.processed_email import ProcessedEmail
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.processed_email_repository import ProcessedEmailRepository
from app.schemas.ingestion_schema import IngestionPayload


class IngestionService:
    def __init__(
        self,
        dashboard_repository: DashboardRepository,
        processed_email_repository: ProcessedEmailRepository,
    ):
        self.dashboard_repository = dashboard_repository
        self.processed_email_repository = processed_email_repository

    def ingest(self, payload: IngestionPayload) -> dict:
        # Evita reprocessar o mesmo e-mail (Épico 2)
        if self.processed_email_repository.exists(payload.email.message_id):
            return {"status": "skipped", "reason": "e-mail já processado"}

        # Alguns relatórios, como o War Room U:CG, são fotografias completas.
        # Limpar antes do upsert impede que meses/anos ausentes permaneçam como
        # dados antigos ou placeholders no dashboard.
        for kpi_type in payload.replace_kpis:
            self.dashboard_repository.delete_all_kpi_records(kpi_type)

        for record in payload.records:
            if record.kpi_type not in KPI_MODEL_MAP:
                valid = ", ".join(KPI_MODEL_MAP)
                raise DomainError(f"kpi_type inválido: {record.kpi_type}. Válidos: {valid}", status_code=422)
            self.dashboard_repository.upsert_kpi_record(
                kpi_type=record.kpi_type,
                month=record.month,
                year=record.year,
                target=record.target,
                result=record.result,
                achievement=record.achievement,
            )

        for lvp in payload.logistics_vs_prod:
            self.dashboard_repository.upsert_logistics_vs_prod(
                month=lvp.month,
                year=lvp.year,
                logistics_cost=lvp.logistics_cost,
                production_amount=lvp.production_amount,
                ratio=lvp.ratio,
            )

        self.processed_email_repository.create(
            ProcessedEmail(
                id=str(uuid.uuid4()),
                message_id=payload.email.message_id,
                subject=payload.email.subject,
                sender=payload.email.sender,
                status="PROCESSED",
            )
        )
        self.dashboard_repository.commit()

        return {
            "status": "processed",
            "kpi_records": len(payload.records),
            "logistics_vs_prod_records": len(payload.logistics_vs_prod),
        }
