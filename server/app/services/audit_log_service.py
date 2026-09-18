"""
app/services/audit_log_service.py
Serviço de auditoria append-only — central de registro de eventos críticos.

REGRA DE NEGÓCIO: Esta tabela nunca recebe UPDATE ou DELETE.
Correções são registradas como novas entradas corretivas.
"""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.core.exceptions import DomainError


class AuditLogService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditLogRepository(db)

    def log(
        self,
        action: str,
        actor_user_id: str | None = None,
        actor_role_snapshot: str | None = None,
        target_type: str | None = None,
        target_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """
        Registra um evento no audit_log. Sempre INSERT — nunca UPDATE.
        """
        entry = AuditLog(
            actor_user_id=actor_user_id,
            actor_role_snapshot=actor_role_snapshot,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata_=metadata,
            ip_address=ip_address,
        )
        return self.repo.create(entry)

    def query(
        self,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        actor_user_id: str | None = None,
        action: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        """
        Consulta paginada do audit_log.
        Exige pelo menos date_from ou date_to para evitar dumps sem filtro.
        """
        if date_from is None and date_to is None:
            raise DomainError(
                "É obrigatório informar pelo menos date_from ou date_to para consultar o audit log.",
                status_code=422,
            )

        records, total = self.repo.query(
            date_from=date_from,
            date_to=date_to,
            actor_user_id=actor_user_id,
            action=action,
            page=page,
            page_size=page_size,
        )

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [self._serialize(r) for r in records],
        }

    @staticmethod
    def _serialize(entry: AuditLog) -> dict:
        return {
            "id": entry.id,
            "actor_user_id": entry.actor_user_id,
            "actor_role_snapshot": entry.actor_role_snapshot,
            "action": entry.action,
            "target_type": entry.target_type,
            "target_id": entry.target_id,
            "metadata": entry.metadata_,
            "occurred_at": entry.occurred_at.isoformat() if entry.occurred_at else None,
            "ip_address": entry.ip_address,
        }
