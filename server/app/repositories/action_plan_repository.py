"""
app/repositories/action_plan_repository.py
CRUD de planos de ação.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.action_plan import ActionPlan


KPI_MAP = {
    "logisticCost": "logistic_cost",
    "incidentialCost": "incidental_cost",
    "totalCost": "total_cost",
    "airFreight": "air_freight",
    "demurrage": "demurrage",
    "logisticsVsProd": "logistics_vs_prod",
}


def _normalize_kpis(kpi: str) -> list[str]:
    kpis = [kpi]
    norm = KPI_MAP.get(kpi)
    if norm and norm not in kpis:
        kpis.append(norm)
    for k, v in KPI_MAP.items():
        if v == kpi and k not in kpis:
            kpis.append(k)
    return kpis


def _normalize_years(year: str) -> list[str]:
    y = str(year).strip()
    res = [y]
    if y.startswith("Y") and y[1:].isdigit():
        alt = f"20{y[1:]}"
        if alt not in res:
            res.append(alt)
    elif len(y) == 4 and y.startswith("20") and y[2:].isdigit():
        alt = f"Y{y[2:]}"
        if alt not in res:
            res.append(alt)
    return res


class ActionPlanRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(
        self,
        kpi_type: str | None = None,
        year: str | None = None,
        period: str | None = None,
        status: str | None = None,
    ) -> list[ActionPlan]:
        stmt = select(ActionPlan).order_by(ActionPlan.created_at.desc())
        if kpi_type:
            stmt = stmt.where(ActionPlan.kpi_type.in_(_normalize_kpis(kpi_type)))
        if year:
            stmt = stmt.where(ActionPlan.year.in_(_normalize_years(year)))
        if period:
            stmt = stmt.where(ActionPlan.period == period)
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
