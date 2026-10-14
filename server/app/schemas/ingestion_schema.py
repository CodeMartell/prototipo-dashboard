"""
app/schemas/ingestion_schema.py
Contrato entre esta API e o bot de extração (Épico 2/3).
"""
import re
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

NonNegativeFinite = Annotated[float, Field(ge=0, allow_inf_nan=False)]
VALID_MONTHS = {
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "Annual",
}
YEAR_PATTERN = re.compile(r"^Y\d{2}$")


class PeriodValidated(BaseModel):
    month: str
    year: str

    @field_validator("month")
    @classmethod
    def valid_month(cls, value: str) -> str:
        if value not in VALID_MONTHS:
            raise ValueError("month inválido")
        return value

    @field_validator("year")
    @classmethod
    def valid_year(cls, value: str) -> str:
        if not YEAR_PATTERN.fullmatch(value):
            raise ValueError("year deve usar o formato YNN, por exemplo Y26")
        return value


class ProcessedEmailIn(BaseModel):
    """Metadados do e-mail, pro controle de duplicidade e governança de staging."""

    message_id: str
    subject: str
    sender: str
    file_name: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    period_label: str | None = None

    @field_validator("message_id", "subject", "sender")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("campo obrigatório vazio")
        return value


class KpiReportIn(PeriodValidated):
    """Um registro de KPI padrão."""

    kpi_type: str
    target: NonNegativeFinite
    result: NonNegativeFinite
    achievement: NonNegativeFinite | None = None


class LogisticsVsProdIn(PeriodValidated):
    """Registro da tabela logistics_vs_prod."""

    logistics_cost: NonNegativeFinite
    production_amount: NonNegativeFinite
    ratio: NonNegativeFinite | None = None


class IngestionPayload(BaseModel):
    """Corpo esperado em POST /api/ingestion/kpi-report."""

    email: ProcessedEmailIn
    records: list[KpiReportIn] = Field(default_factory=list)
    logistics_vs_prod: list[LogisticsVsProdIn] = Field(default_factory=list)
    replace_kpis: list[
        Literal["logistic_cost", "air_freight", "incidental_cost", "total_cost", "demurrage"]
    ] = Field(default_factory=list)

    @model_validator(mode="after")
    def at_least_one_record(self):
        if not self.records and not self.logistics_vs_prod:
            raise ValueError("payload deve conter pelo menos um registro")
        record_types = {record.kpi_type for record in self.records}
        missing_snapshots = set(self.replace_kpis) - record_types
        if missing_snapshots:
            raise ValueError("replace_kpis exige registros do mesmo indicador")
        return self
