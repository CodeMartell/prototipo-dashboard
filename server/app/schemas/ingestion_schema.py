"""
app/schemas/ingestion_schema.py
Contrato entre esta API  e o bot de extração (Épico 2/3).
O bot deixa de escrever direto no Postgres e passa a chamar
POST /api/ingestion/kpi-report com esse formato.

kpi_type aceita os 5 nomes padrão ("logistic_cost", "air_freight",
"incidental_cost", "total_cost", "demurrage") ou "logistics_vs_prod"
(que usa os campos logistics_cost/production_amount/ratio em vez de
target/result).
"""
import re
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator


NonNegativeFinite = Annotated[float, Field(ge=0, allow_inf_nan=False)]
VALID_MONTHS = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
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
    """Metadados do e-mail, pro controle de duplicidade (Épico 2)."""

    message_id: str
    subject: str
    sender: str

    @field_validator("message_id", "subject", "sender")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("campo obrigatório vazio")
        return value


class KpiReportIn(PeriodValidated):
    """Um registro de KPI padrão, já extraído e validado pelo Épico 3."""

    kpi_type: str  # logistic_cost | air_freight | incidental_cost | total_cost | demurrage
    target: NonNegativeFinite
    result: NonNegativeFinite
    achievement: NonNegativeFinite | None = None


class LogisticsVsProdIn(PeriodValidated):
    """Registro da tabela logistics_vs_prod — campos diferentes do padrão."""

    logistics_cost: NonNegativeFinite
    production_amount: NonNegativeFinite
    ratio: NonNegativeFinite | None = None


class IngestionPayload(BaseModel):
    """Corpo esperado em POST /api/ingestion/kpi-report."""

    email: ProcessedEmailIn
    records: list[KpiReportIn] = Field(default_factory=list)
    logistics_vs_prod: list[LogisticsVsProdIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def at_least_one_record(self):
        if not self.records and not self.logistics_vs_prod:
            raise ValueError("payload deve conter pelo menos um registro")
        return self
