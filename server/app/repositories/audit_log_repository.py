"""
app/repositories/audit_log_repository.py
Repositório append-only do audit_log — apenas INSERT e SELECT.
Nunca expõe UPDATE ou DELETE para garantir imutabilidade.
"""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, entry: AuditLog) -> AuditLog:
        """Único método de escrita — apenas INSERT."""
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def query(
        self,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        actor_user_id: str | None = None,
        action: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """
        Retorna (registros, total) com paginação.
        Exige pelo menos date_from ou date_to — validação feita no service.
        """
        stmt = select(AuditLog).order_by(AuditLog.occurred_at.desc())
        count_stmt = select(AuditLog)

        if date_from is not None:
            stmt = stmt.where(AuditLog.occurred_at >= date_from)
            count_stmt = count_stmt.where(AuditLog.occurred_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(AuditLog.occurred_at <= date_to)
            count_stmt = count_stmt.where(AuditLog.occurred_at <= date_to)
        if actor_user_id:
            stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
            count_stmt = count_stmt.where(AuditLog.actor_user_id == actor_user_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
            count_stmt = count_stmt.where(AuditLog.action == action)

        total = len(list(self.db.scalars(count_stmt)))
        offset = (page - 1) * page_size
        records = list(self.db.scalars(stmt.limit(page_size).offset(offset)))
        return records, total
