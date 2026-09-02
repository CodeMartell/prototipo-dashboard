"""
app/schemas/dashboard_schema.py
DTOs de entrada/saída dos endpoints de KPI — equivalente aos *.validators.ts.
"""
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.core.kpi_meta import validate_month, validate_year

FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]


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


class PeriodPath(BaseModel):
    """Valida month/year vindos da URL nas rotas de escrita manual."""

    month: str
    year: str

    @field_validator("month")
    @classmethod
    def _month(cls, value: str) -> str:
        return validate_month(value)

    @field_validator("year")
    @classmethod
    def _year(cls, value: str) -> str:
        return validate_year(value)


class KpiRecordIn(BaseModel):
    """
    Entrada manual de um indicador padrao (formulario do dashboard).
    achievement e opcional: quando nao vem, o backend calcula a partir de
    target/result respeitando a direcao do indicador.
    """

    target: FiniteFloat
    result: FiniteFloat
    achievement: FiniteFloat | None = None


class LogisticsVsProdIn(BaseModel):
    """Entrada manual de logistics_vs_prod. ratio e derivado quando ausente."""

    logistics_cost: FiniteFloat
    production_amount: FiniteFloat
    ratio: FiniteFloat | None = None
