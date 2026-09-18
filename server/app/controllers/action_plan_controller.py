"""
app/controllers/action_plan_controller.py
CRUD de planos de ação — ownership check para GESTOR no delete.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_permission
from app.repositories.action_plan_repository import ActionPlanRepository
from app.schemas.action_plan_schema import ActionPlanIn, ActionPlanOut
from app.services.action_plan_service import ActionPlanService

router = APIRouter(prefix="/api/action-plans", tags=["action-plans"])


def _get_service(db: Session = Depends(get_db)) -> ActionPlanService:
    return ActionPlanService(ActionPlanRepository(db))


@router.get("", response_model=list[ActionPlanOut])
def list_plans(
    kpi_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    service: ActionPlanService = Depends(_get_service),
    _: dict = Depends(require_permission("action_plans:read")),
):
    return service.list_plans(kpi_type=kpi_type, status=status)


@router.get("/{plan_id}", response_model=ActionPlanOut)
def get_plan(
    plan_id: str,
    service: ActionPlanService = Depends(_get_service),
    _: dict = Depends(require_permission("action_plans:read")),
):
    return service.get_plan(plan_id)


@router.post("", response_model=ActionPlanOut, status_code=201)
def create_plan(
    payload: ActionPlanIn,
    service: ActionPlanService = Depends(_get_service),
    current_user: dict = Depends(require_permission("action_plans:write")),
):
    return service.create_plan(payload, actor=current_user)


@router.put("/{plan_id}", response_model=ActionPlanOut)
def update_plan(
    plan_id: str,
    payload: ActionPlanIn,
    service: ActionPlanService = Depends(_get_service),
    current_user: dict = Depends(require_permission("action_plans:write")),
):
    return service.update_plan(plan_id, payload, actor=current_user)


@router.delete("/{plan_id}", status_code=204)
def delete_plan(
    plan_id: str,
    service: ActionPlanService = Depends(_get_service),
    current_user: dict = Depends(require_permission("action_plans:delete")),
):
    """Ownership check: GESTOR só pode excluir planos que criou. ADMIN exclui qualquer."""
    service.delete_plan(plan_id, actor=current_user)
