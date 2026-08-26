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
from pydantic import BaseModel


class ProcessedEmailIn(BaseModel):
    """Metadados do e-mail, pro controle de duplicidade (Épico 2)."""

    message_id: str
    subject: str
    sender: str


class KpiReportIn(BaseModel):
    """Um registro de KPI padrão, já extraído e validado pelo Épico 3."""

    kpi_type: str  # logistic_cost | air_freight | incidental_cost | total_cost | demurrage
    month: str
    year: str
    target: float
    result: float
    achievement: float | None = None


class LogisticsVsProdIn(BaseModel):
    """Registro da tabela logistics_vs_prod — campos diferentes do padrão."""

    month: str
    year: str
    logistics_cost: float
    production_amount: float
    ratio: float | None = None


class IngestionPayload(BaseModel):
    """Corpo esperado em POST /api/ingestion/kpi-report."""

    email: ProcessedEmailIn
    records: list[KpiReportIn] = []
    logistics_vs_prod: list[LogisticsVsProdIn] = []
