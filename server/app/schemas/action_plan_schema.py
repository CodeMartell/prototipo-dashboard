"""
app/schemas/action_plan_schema.py
DTOs de planos de ação.
"""
from datetime import datetime
from pydantic import BaseModel


class ActionPlanIn(BaseModel):
    title: str
    description: str | None = None
    status: str | None = "open"
    kpi_type: str | None = None


class ActionPlanOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    status: str
    kpi_type: str | None = None
    submitted_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
