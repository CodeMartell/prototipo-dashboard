"""
app/services/action_plan_service.py
Planos de ação — com ownership check para GESTOR.

REGRA CRÍTICA (ownership check):
- kpi:delete / action_plans:delete do GESTOR exige submitted_by == actor.id
- ADMIN ignora a checagem de ownership
"""
from app.core.exceptions import DomainError, ForbiddenError, NotFoundError
from app.models.action_plan import ActionPlan
from app.repositories.action_plan_repository import ActionPlanRepository
from app.schemas.action_plan_schema import ActionPlanIn


class ActionPlanService:
    def __init__(self, repository: ActionPlanRepository):
        self.repo = repository

    def list_plans(self, kpi_type: str | None = None, status: str | None = None) -> list[ActionPlan]:
        return self.repo.list_all(kpi_type=kpi_type, status=status)

    def get_plan(self, plan_id: str) -> ActionPlan:
        plan = self.repo.get_by_id(plan_id)
        if plan is None:
            raise NotFoundError(f"Plano de ação {plan_id} não encontrado")
        return plan

    def create_plan(self, payload: ActionPlanIn, actor: dict) -> ActionPlan:
        plan = ActionPlan(
            title=payload.title,
            description=payload.description,
            status=payload.status or "open",
            kpi_type=payload.kpi_type,
            submitted_by=actor.get("id"),
        )
        created = self.repo.create(plan)
        # Registra no audit_log
        try:
            from app.services.audit_log_service import AuditLogService
            AuditLogService(self.repo.db).log(
                action="action_plan.created",
                actor_user_id=actor.get("id"),
                actor_role_snapshot=actor.get("role"),
                target_type="action_plan",
                target_id=created.id,
                metadata={"title": payload.title},
            )
        except Exception:
            pass
        return created

    def update_plan(self, plan_id: str, payload: ActionPlanIn, actor: dict) -> ActionPlan:
        plan = self.get_plan(plan_id)
        plan.title = payload.title
        if payload.description is not None:
            plan.description = payload.description
        if payload.status is not None:
            plan.status = payload.status
        if payload.kpi_type is not None:
            plan.kpi_type = payload.kpi_type
        return self.repo.update(plan)

    def delete_plan(self, plan_id: str, actor: dict) -> None:
        """
        Exclui um plano de ação com ownership check.

        ADMIN: pode excluir qualquer plano.
        GESTOR: só pode excluir planos que ele mesmo criou (submitted_by == actor.id).
        """
        plan = self.get_plan(plan_id)
        actor_role = actor.get("role", "")

        if actor_role == "GESTOR":
            if plan.submitted_by != actor.get("id"):
                raise ForbiddenError(
                    "GESTOR só pode excluir planos de ação criados por ele mesmo."
                )

        # Registra no audit_log antes de excluir
        try:
            from app.services.audit_log_service import AuditLogService
            AuditLogService(self.repo.db).log(
                action="action_plan.deleted",
                actor_user_id=actor.get("id"),
                actor_role_snapshot=actor_role,
                target_type="action_plan",
                target_id=plan_id,
                metadata={"title": plan.title, "submitted_by": plan.submitted_by},
            )
        except Exception:
            pass

        self.repo.delete(plan_id)
