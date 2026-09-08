"""
app/services/activity_log_service.py
Serviço de auditoria e registro de atividades do sistema.
"""
from typing import Any
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.core.logging import audit_logger


class ActivityLogService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action_type: str,
        user_id: str | None = None,
        user_email: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        detail: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> ActivityLog:
        """
        Registra uma ação no banco de dados e no log de texto de auditoria.
        """
        entry = ActivityLog(
            user_id=user_id,
            user_email=user_email,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
            ip_address=ip_address,
        )
        self.db.add(entry)
        self.db.commit()

        # Também grava em arquivo audit.log
        msg = f"ACTION={action_type} USER={user_email or user_id or 'SYSTEM'} ENTITY={entity_type}:{entity_id}"
        if ip_address:
            msg += f" IP={ip_address}"
        audit_logger.info(msg)

        return entry

    def list_activities(
        self,
        action_type: str | None = None,
        user_id: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ActivityLog]:
        from sqlalchemy import select
        stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc())
        if action_type:
            stmt = stmt.where(ActivityLog.action_type == action_type)
        if user_id:
            stmt = stmt.where(ActivityLog.user_id == user_id)
        stmt = stmt.limit(limit).offset(offset)
        return list(self.db.scalars(stmt))
