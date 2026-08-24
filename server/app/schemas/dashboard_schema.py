"""
app/schemas/dashboard_schema.py
DTOs de entrada/saída dos endpoints de KPI — equivalente aos *.validators.ts.
"""
from pydantic import BaseModel


class KpiRecordOut(BaseModel):
    month: str
    year: str
    target: float
    result: float
    achievement: float | None = None

    model_config = {"from_attributes": True}  # permite montar direto do model SQLAlchemy


class LogisticsVsProdOut(BaseModel):
    month: str
    year: str
    logistics_cost: float
    production_amount: float
    ratio: float | None = None

    model_config = {"from_attributes": True}


class KpiFilterParams(BaseModel):
    year: str | None = None
    month: str | None = None
