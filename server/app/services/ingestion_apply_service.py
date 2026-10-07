"""
app/services/ingestion_apply_service.py
Serviço responsável pela governança (aprovação, rejeição e rollback)
das atualizações de planilha que estão em staging na email_ingest_queue.
"""
from datetime import datetime, timezone
from typing import Any
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.exceptions import DomainError
from app.models.email_ingest_queue import EmailIngestQueue
from app.models.kpi_change_log import KpiChangeLog
from app.models.processed_email import ProcessedEmail
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.processed_email_repository import ProcessedEmailRepository
from app.services.activity_log_service import ActivityLogService


class IngestionApplyService:
    def __init__(
        self,
        db: Session,
        dashboard_repo: DashboardRepository,
        processed_email_repo: ProcessedEmailRepository,
    ):
        self.db = db
        self.dashboard_repo = dashboard_repo
        self.processed_email_repo = processed_email_repo

    def accept_ingestion(
        self, queue_id: str, user: dict, selected_items: list[dict[str, str]] | None = None
    ) -> dict:
        stmt = select(EmailIngestQueue).where(EmailIngestQueue.id == queue_id)
        queue_item = self.db.scalars(stmt).first()
        if not queue_item:
            raise DomainError("Item da fila de ingestão não encontrado", status_code=404)

        if queue_item.status != "PENDING":
            raise DomainError(f"Item já foi processado (status atual: {queue_item.status})", status_code=400)

        payload_raw = queue_item.payload_raw or {}
        records = payload_raw.get("records", [])
        logistics_vs_prod = payload_raw.get("logistics_vs_prod", [])
        replace_kpis = payload_raw.get("replace_kpis", [])

        # Filter if partial acceptance requested
        if selected_items:
            allowed_set = {
                (item.get("kpi_type"), item.get("month"), item.get("year")) for item in selected_items
            }
            records = [
                r for r in records
                if (r.get("kpi_type"), r.get("month"), r.get("year")) in allowed_set
            ]
            logistics_vs_prod = [
                lvp for lvp in logistics_vs_prod
                if ("logistics_vs_prod", lvp.get("month"), lvp.get("year")) in allowed_set
            ]

        user_id = user.get("id")
        user_email = user.get("email")

        # Replace KPIs clean up if configured
        for kpi_type in replace_kpis:
            # Only delete if standard full accept
            if not selected_items:
                self.dashboard_repo.delete_all_kpi_records(kpi_type)

        applied_count = 0

        # Apply standard records
        for record in records:
            kpi_type = record["kpi_type"]
            month = record["month"]
            year = record["year"]
            target = record["target"]
            result = record["result"]
            achievement = record.get("achievement")

            # Fetch existing to record change log
            existing_list = self.dashboard_repo.list_kpi_records(kpi_type, year=year, month=month)
            existing = existing_list[0] if existing_list else None
            snapshot_before = {
                "target": float(existing.target) if existing and existing.target is not None else None,
                "result": float(existing.result) if existing and existing.result is not None else None,
                "achievement": float(existing.achievement) if existing and existing.achievement is not None else None,
            } if existing else None

            self.dashboard_repo.upsert_kpi_record(
                kpi_type=kpi_type,
                month=month,
                year=year,
                target=target,
                result=result,
                achievement=achievement,
            )

            # Record change log entry
            change = KpiChangeLog(
                user_id=user_id,
                user_email=user_email,
                kpi_type=kpi_type,
                month=month,
                year=year,
                field_name="result",
                old_value=snapshot_before["result"] if snapshot_before else None,
                new_value=result,
                source="email_ingestion",
                snapshot_before=snapshot_before,
            )
            self.db.add(change)
            applied_count += 1

        # Apply logistics vs prod records
        for lvp in logistics_vs_prod:
            month = lvp["month"]
            year = lvp["year"]
            logistics_cost = lvp["logistics_cost"]
            production_amount = lvp["production_amount"]
            ratio = lvp.get("ratio")

            existing_list = [r for r in self.dashboard_repo.list_logistics_vs_prod() if r.month == month and r.year == year]
            existing = existing_list[0] if existing_list else None
            snapshot_before = {
                "logistics_cost": float(existing.logistics_cost) if existing else None,
                "production_amount": float(existing.production_amount) if existing else None,
                "ratio": float(existing.ratio) if existing and existing.ratio is not None else None,
            } if existing else None

            self.dashboard_repo.upsert_logistics_vs_prod(
                month=month,
                year=year,
                logistics_cost=logistics_cost,
                production_amount=production_amount,
                ratio=ratio,
            )

            change = KpiChangeLog(
                user_id=user_id,
                user_email=user_email,
                kpi_type="logistics_vs_prod",
                month=month,
                year=year,
                field_name="logistics_cost",
                old_value=snapshot_before["logistics_cost"] if snapshot_before else None,
                new_value=logistics_cost,
                source="email_ingestion",
                snapshot_before=snapshot_before,
            )
            self.db.add(change)
            applied_count += 1

        # Create ProcessedEmail record
        if not self.processed_email_repo.exists(queue_item.message_id):
            self.processed_email_repo.create(
                ProcessedEmail(
                    id=str(uuid.uuid4()),
                    message_id=queue_item.message_id,
                    subject=queue_item.subject,
                    sender=queue_item.sender,
                    status="PROCESSED",
                )
            )

        # Update queue item
        queue_item.status = "ACCEPTED"
        queue_item.reviewed_by = user_id
        queue_item.reviewer_email = user_email
        queue_item.reviewed_at = datetime.now(timezone.utc)

        self.db.commit()

        # Log activity
        ActivityLogService(self.db).log(
            action_type="EMAIL_INGEST_ACCEPTED",
            user_id=user_id,
            user_email=user_email,
            entity_type="email_ingest_queue",
            entity_id=queue_item.id,
            detail={
                "message_id": queue_item.message_id,
                "file_name": queue_item.file_name,
                "period_label": queue_item.period_label,
                "applied_records_count": applied_count,
                "is_partial": bool(selected_items),
            },
        )

        return {
            "status": "success",
            "message": "Ingestão aprovada e aplicada no dashboard",
            "applied_records": applied_count,
        }

    def reject_ingestion(self, queue_id: str, reason: str | None, user: dict) -> dict:
        stmt = select(EmailIngestQueue).where(EmailIngestQueue.id == queue_id)
        queue_item = self.db.scalars(stmt).first()
        if not queue_item:
            raise DomainError("Item da fila de ingestão não encontrado", status_code=404)

        if queue_item.status != "PENDING":
            raise DomainError(f"Item já foi processado (status atual: {queue_item.status})", status_code=400)

        user_id = user.get("id")
        user_email = user.get("email")

        queue_item.status = "REJECTED"
        queue_item.reject_reason = reason
        queue_item.reviewed_by = user_id
        queue_item.reviewer_email = user_email
        queue_item.reviewed_at = datetime.now(timezone.utc)

        self.db.commit()

        ActivityLogService(self.db).log(
            action_type="EMAIL_INGEST_REJECTED",
            user_id=user_id,
            user_email=user_email,
            entity_type="email_ingest_queue",
            entity_id=queue_item.id,
            detail={
                "file_name": queue_item.file_name,
                "period_label": queue_item.period_label,
                "reject_reason": reason,
            },
        )

        return {"status": "success", "message": "Atualização de planilha rejeitada com sucesso"}

    def rollback_ingestion(self, queue_id: str, user: dict) -> dict:
        stmt = select(EmailIngestQueue).where(EmailIngestQueue.id == queue_id)
        queue_item = self.db.scalars(stmt).first()
        if not queue_item:
            raise DomainError("Item da fila de ingestão não encontrado", status_code=404)

        if queue_item.status != "ACCEPTED":
            raise DomainError("Apenas ingestões no estado 'ACCEPTED' podem ser revertidas", status_code=400)

        user_id = user.get("id")
        user_email = user.get("email")

        diff_snapshot = queue_item.diff_snapshot or []
        restored_count = 0

        for diff in diff_snapshot:
            diff_type = diff.get("type")
            kpi_type = diff.get("kpi_type")
            month = diff.get("month")
            year = diff.get("year")

            if diff_type == "standard":
                old_target = diff.get("current_target")
                old_result = diff.get("current_result")
                old_achievement = diff.get("current_achievement")

                if old_result is None:
                    # Record did not exist previously -> delete
                    self.dashboard_repo.delete_kpi_record(kpi_type, month=month, year=year)
                else:
                    self.dashboard_repo.upsert_kpi_record(
                        kpi_type=kpi_type,
                        month=month,
                        year=year,
                        target=old_target or 0.0,
                        result=old_result or 0.0,
                        achievement=old_achievement,
                    )
                restored_count += 1

            elif diff_type == "logistics_vs_prod":
                old_cost = diff.get("current_logistics_cost")
                old_prod = diff.get("current_production_amount")
                old_ratio = diff.get("current_ratio")

                if old_cost is not None and old_prod is not None:
                    self.dashboard_repo.upsert_logistics_vs_prod(
                        month=month,
                        year=year,
                        logistics_cost=old_cost,
                        production_amount=old_prod,
                        ratio=old_ratio,
                    )
                    restored_count += 1

        queue_item.status = "SUPERSEDED"
        self.db.commit()

        ActivityLogService(self.db).log(
            action_type="ROLLBACK",
            user_id=user_id,
            user_email=user_email,
            entity_type="email_ingest_queue",
            entity_id=queue_item.id,
            detail={
                "file_name": queue_item.file_name,
                "period_label": queue_item.period_label,
                "restored_records_count": restored_count,
            },
        )

        return {"status": "success", "message": "Rollback concluído. Valores anteriores restaurados."}
