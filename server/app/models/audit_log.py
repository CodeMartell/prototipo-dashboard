"""
app/models/audit_log.py
Tabela de auditoria append-only — nunca UPDATE ou DELETE.

Correções são feitas por entrada corretiva nova, nunca editando linhas existentes.
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    actor_role_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Papel do usuário NO MOMENTO da ação — não é FK dinâmico, é snapshot imutável
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    # ex: 'kpi.manual_edit', 'user.created', 'user.role_changed', 'login.success', 'login.failed'
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 'kpi_report' | 'user' | 'action_plan'
    target_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    # JSON com valores antes/depois — coluna "metadata" no banco
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
