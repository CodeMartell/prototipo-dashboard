"""
app/services/ingestion_service.py
Recebe os dados extraídos pelo bot (Épico 2/3) via HTTP e coloca em
staging na fila de aprovação (email_ingest_queue) calculando diffs.
"""
import uuid
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.exceptions import DomainError
from app.models.email_ingest_queue import EmailIngestQueue
from app.models.kpi_change_log import KpiChangeLog
from app.models.processed_email import ProcessedEmail
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.processed_email_repository import ProcessedEmailRepository
from app.schemas.ingestion_schema import IngestionPayload
from app.services.activity_log_service import ActivityLogService


class IngestionService:
    def __init__(
        self,
        dashboard_repository: DashboardRepository,
        processed_email_repository: ProcessedEmailRepository,
    ):
        self.dashboard_repository = dashboard_repository
        self.processed_email_repository = processed_email_repository
        self.db: Session = dashboard_repository.db

    def ingest(self, payload: IngestionPayload) -> dict:
        # Check if email message_id was already processed or queued
        if self.processed_email_repository.exists(payload.email.message_id):
            return {"status": "skipped", "reason": "e-mail já processado anteriormente"}

        stmt_existing_queue = select(EmailIngestQueue).where(
            EmailIngestQueue.message_id == payload.email.message_id
        )
        existing_queue = self.db.scalars(stmt_existing_queue).first()
        if existing_queue:
            return {
                "status": "skipped",
                "reason": f"e-mail já está na fila de aprovação (status: {existing_queue.status})",
                "queue_id": existing_queue.id,
            }

        diff_snapshot: list[dict[str, Any]] = []
        kpi_types_set = set()
        has_manual_conflict = False
        is_update = False
        months_set = set()
        years_set = set()

        # Check standard records
        for record in payload.records:
            kpi_types_set.add(record.kpi_type)
            months_set.add(record.month)
            years_set.add(record.year)

            existing_list = self.dashboard_repository.list_kpi_records(
                record.kpi_type, year=record.year, month=record.month
            )
            existing = existing_list[0] if existing_list else None

            if existing:
                is_update = True

            # Check if this record had a manual override in kpi_change_log
            stmt_manual = select(KpiChangeLog).where(
                KpiChangeLog.kpi_type == record.kpi_type,
                KpiChangeLog.month == record.month,
                KpiChangeLog.year == record.year,
                KpiChangeLog.source == "manual",
            )
            manual_edit = self.db.scalars(stmt_manual).first()
            record_conflict = manual_edit is not None
            if record_conflict:
                has_manual_conflict = True

            diff_snapshot.append({
                "type": "standard",
                "kpi_type": record.kpi_type,
                "month": record.month,
                "year": record.year,
                "current_target": float(existing.target) if existing and existing.target is not None else None,
                "current_result": float(existing.result) if existing and existing.result is not None else None,
                "current_achievement": float(existing.achievement) if existing and existing.achievement is not None else None,
                "new_target": record.target,
                "new_result": record.result,
                "new_achievement": record.achievement,
                "has_conflict": record_conflict,
                "conflict_detail": (
                    f"Ajustado manualmente em {manual_edit.changed_at.strftime('%d/%m/%Y')} por {manual_edit.user_email or 'usuário'}"
                    if manual_edit else None
                ),
            })

        # Check logistics vs prod records
        for lvp in payload.logistics_vs_prod:
            kpi_types_set.add("logistics_vs_prod")
            months_set.add(lvp.month)
            years_set.add(lvp.year)

            existing_list = [r for r in self.dashboard_repository.list_logistics_vs_prod() if r.month == lvp.month and r.year == lvp.year]
            existing = existing_list[0] if existing_list else None

            if existing:
                is_update = True

            stmt_manual = select(KpiChangeLog).where(
                KpiChangeLog.kpi_type == "logistics_vs_prod",
                KpiChangeLog.month == lvp.month,
                KpiChangeLog.year == lvp.year,
                KpiChangeLog.source == "manual",
            )
            manual_edit = self.db.scalars(stmt_manual).first()
            record_conflict = manual_edit is not None
            if record_conflict:
                has_manual_conflict = True

            diff_snapshot.append({
                "type": "logistics_vs_prod",
                "kpi_type": "logistics_vs_prod",
                "month": lvp.month,
                "year": lvp.year,
                "current_logistics_cost": float(existing.logistics_cost) if existing else None,
                "current_production_amount": float(existing.production_amount) if existing else None,
                "current_ratio": float(existing.ratio) if existing and existing.ratio is not None else None,
                "new_logistics_cost": lvp.logistics_cost,
                "new_production_amount": lvp.production_amount,
                "new_ratio": lvp.ratio,
                "has_conflict": record_conflict,
                "conflict_detail": (
                    f"Ajustado manualmente em {manual_edit.changed_at.strftime('%d/%m/%Y')} por {manual_edit.user_email or 'usuário'}"
                    if manual_edit else None
                ),
            })

        # Generate auto period label if not provided
        period_label = payload.email.period_label
        if not period_label:
            sorted_months = sorted(list(months_set))
            sorted_years = sorted(list(years_set))
            if sorted_months and sorted_years:
                period_label = f"{sorted_months[0]} a {sorted_months[-1]}/{'/'.join(sorted_years)}"

        queue_item = EmailIngestQueue(
            id=str(uuid.uuid4()),
            message_id=payload.email.message_id,
            subject=payload.email.subject,
            sender=payload.email.sender,
            file_name=payload.email.file_name or "relatorio_logistico.xlsx",
            period_start=payload.email.period_start or (sorted(list(months_set))[0] if months_set else None),
            period_end=payload.email.period_end or (sorted(list(months_set))[-1] if months_set else None),
            period_label=period_label,
            kpi_types=list(kpi_types_set),
            diff_snapshot=diff_snapshot,
            payload_raw=payload.model_dump(),
            status="PENDING",
            has_manual_conflict=has_manual_conflict,
            is_update=is_update,
        )

        self.db.add(queue_item)
        self.db.commit()

        # Log Activity
        ActivityLogService(self.db).log(
            action_type="EMAIL_INGEST_PENDING",
            entity_type="email_ingest_queue",
            entity_id=queue_item.id,
            detail={
                "subject": payload.email.subject,
                "sender": payload.email.sender,
                "file_name": queue_item.file_name,
                "period_label": period_label,
                "kpis_affected": list(kpi_types_set),
                "has_manual_conflict": has_manual_conflict,
                "is_update": is_update,
            },
        )

        return {
            "status": "pending",
            "queue_id": queue_item.id,
            "period_label": period_label,
            "kpis_affected": list(kpi_types_set),
            "has_manual_conflict": has_manual_conflict,
            "message": "Planilha recebida com sucesso e colocada na fila de aprovação",
        }
