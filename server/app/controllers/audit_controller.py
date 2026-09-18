"""
app/controllers/audit_controller.py
Endpoints de consulta ao audit log.

Regras de acesso:
- audit:read_all → qualquer filtro (ADMIN, AUDITORIA)
- audit:read_scoped → exige actor_user_id (TI_SUPORTE pode ver qualquer usuário)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_permission
from app.core.exceptions import DomainError, ForbiddenError
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


def _get_service(db: Session = Depends(get_db)) -> AuditLogService:
    return AuditLogService(db)


@router.get("")
def get_audit_logs(
    date_from: datetime | None = Query(default=None, description="Filtro de data inicial (ISO 8601)"),
    date_to: datetime | None = Query(default=None, description="Filtro de data final (ISO 8601)"),
    actor_user_id: str | None = Query(default=None, description="ID do usuário para filtrar ações"),
    action: str | None = Query(default=None, description="Tipo de ação, ex: login.success"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    service: AuditLogService = Depends(_get_service),
):
    """
    Consulta paginada do audit log.

    - audit:read_all: sem restrição de actor_user_id
    - audit:read_scoped: actor_user_id é obrigatório
    - Sem qualquer permissão de auditoria: 403
    """
    user_perms: list[str] = current_user.get("permissions", [])
    has_read_all = "audit:read_all" in user_perms
    has_read_scoped = "audit:read_scoped" in user_perms

    if not has_read_all and not has_read_scoped:
        raise ForbiddenError("Sem permissão para acessar o audit log.")

    if has_read_scoped and not has_read_all:
        # read_scoped obriga a informar actor_user_id
        if not actor_user_id:
            raise DomainError(
                "Permissão audit:read_scoped exige que o parâmetro actor_user_id seja informado.",
                status_code=422,
            )

    return service.query(
        date_from=date_from,
        date_to=date_to,
        actor_user_id=actor_user_id,
        action=action,
        page=page,
        page_size=page_size,
    )
