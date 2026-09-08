"""
app/controllers/profile_controller.py
Endpoints para a página de Perfil do Usuário: Histórico de Atividade,
Rastreabilidade de Alterações Manuais, Governança de Ingestões por Email e Staging.
"""
from typing import Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.activity_log import ActivityLog
from app.models.email_ingest_queue import EmailIngestQueue
from app.models.kpi_change_log import KpiChangeLog
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.processed_email_repository import ProcessedEmailRepository
from app.services.activity_log_service import ActivityLogService
from app.services.ingestion_apply_service import IngestionApplyService

router = APIRouter(prefix="/api/profile", tags=["profile"], dependencies=[Depends(get_current_user)])


class RejectRequest(BaseModel):
    reason: str | None = None


class PartialAcceptItem(BaseModel):
    kpi_type: str
    month: str
    year: str


class PartialAcceptRequest(BaseModel):
    items: list[PartialAcceptItem]


@router.get("/activity")
def get_activity_log(
    action_type: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    service = ActivityLogService(db)
    activities = service.list_activities(action_type=action_type, user_id=user_id, limit=limit, offset=offset)
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_email": a.user_email,
            "action_type": a.action_type,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "detail": a.detail,
            "ip_address": a.ip_address,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
    ]


@router.get("/kpi-changes")
def get_kpi_changes(
    kpi_type: str | None = Query(default=None),
    source: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    stmt = select(KpiChangeLog).order_by(KpiChangeLog.changed_at.desc())
    if kpi_type:
        stmt = stmt.where(KpiChangeLog.kpi_type == kpi_type)
    if source:
        stmt = stmt.where(KpiChangeLog.source == source)
    stmt = stmt.limit(limit).offset(offset)
    changes = list(db.scalars(stmt))

    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "user_email": c.user_email,
            "kpi_type": c.kpi_type,
            "month": c.month,
            "year": c.year,
            "field_name": c.field_name,
            "old_value": float(c.old_value) if c.old_value is not None else None,
            "new_value": float(c.new_value) if c.new_value is not None else None,
            "source": c.source,
            "snapshot_before": c.snapshot_before,
            "changed_at": c.changed_at.isoformat() if c.changed_at else None,
        }
        for c in changes
    ]


@router.get("/email-ingestions")
def get_email_ingestions(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    stmt = select(EmailIngestQueue).order_by(EmailIngestQueue.created_at.desc())
    if status:
        stmt = stmt.where(EmailIngestQueue.status == status)
    stmt = stmt.limit(limit).offset(offset)
    items = list(db.scalars(stmt))

    return [
        {
            "id": item.id,
            "message_id": item.message_id,
            "subject": item.subject,
            "sender": item.sender,
            "file_name": item.file_name,
            "period_start": item.period_start,
            "period_end": item.period_end,
            "period_label": item.period_label,
            "kpi_types": item.kpi_types,
            "diff_snapshot": item.diff_snapshot,
            "status": item.status,
            "has_manual_conflict": item.has_manual_conflict,
            "is_update": item.is_update,
            "reviewed_by": item.reviewed_by,
            "reviewer_email": item.reviewer_email,
            "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
            "reject_reason": item.reject_reason,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


@router.get("/pending-ingestions")
def get_pending_ingestions(db: Session = Depends(get_db)):
    stmt = select(EmailIngestQueue).where(EmailIngestQueue.status == "PENDING").order_by(EmailIngestQueue.created_at.desc())
    items = list(db.scalars(stmt))

    return [
        {
            "id": item.id,
            "message_id": item.message_id,
            "subject": item.subject,
            "sender": item.sender,
            "file_name": item.file_name,
            "period_start": item.period_start,
            "period_end": item.period_end,
            "period_label": item.period_label,
            "kpi_types": item.kpi_types,
            "diff_snapshot": item.diff_snapshot,
            "status": item.status,
            "has_manual_conflict": item.has_manual_conflict,
            "is_update": item.is_update,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]


@router.post("/ingestions/{queue_id}/accept")
def accept_ingestion(
    queue_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("ADMIN")),
):
    service = IngestionApplyService(db, DashboardRepository(db), ProcessedEmailRepository(db))
    return service.accept_ingestion(queue_id, current_user)


@router.post("/ingestions/{queue_id}/accept-partial")
def accept_partial_ingestion(
    queue_id: str,
    payload: PartialAcceptRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("ADMIN")),
):
    service = IngestionApplyService(db, DashboardRepository(db), ProcessedEmailRepository(db))
    selected_items = [item.model_dump() for item in payload.items]
    return service.accept_ingestion(queue_id, current_user, selected_items=selected_items)


@router.post("/ingestions/{queue_id}/reject")
def reject_ingestion(
    queue_id: str,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("ADMIN")),
):
    service = IngestionApplyService(db, DashboardRepository(db), ProcessedEmailRepository(db))
    return service.reject_ingestion(queue_id, payload.reason, current_user)


@router.post("/ingestions/{queue_id}/rollback")
def rollback_ingestion(
    queue_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("ADMIN")),
):
    service = IngestionApplyService(db, DashboardRepository(db), ProcessedEmailRepository(db))
    return service.rollback_ingestion(queue_id, current_user)
