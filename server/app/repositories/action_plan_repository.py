"""
app/repositories/action_plan_repository.py
CRUD de planos de ação.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action_plan import ActionPlan


class ActionPlanRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self, kpi_type: str | None = None, status: str | None = None) -> list[ActionPlan]:
        stmt = select(ActionPlan).order_by(ActionPlan.created_at.desc())
        if kpi_type:
            stmt = stmt.where(ActionPlan.kpi_type == kpi_type)
        if status:
            stmt = stmt.where(ActionPlan.status == status)
        return list(self.db.scalars(stmt))

    def get_by_id(self, plan_id: str) -> ActionPlan | None:
        return self.db.get(ActionPlan, plan_id)

    def create(self, plan: ActionPlan) -> ActionPlan:
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def update(self, plan: ActionPlan) -> ActionPlan:
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def delete(self, plan_id: str) -> bool:
        plan = self.get_by_id(plan_id)
        if plan is None:
            return False
        self.db.delete(plan)
        self.db.commit()
        return True
