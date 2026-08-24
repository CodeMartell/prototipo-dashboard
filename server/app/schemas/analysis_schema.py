"""
app/schemas/analysis_schema.py
DTOs de saída dos endpoints de análise (anomalia, comparação YoY).
"""
from pydantic import BaseModel


class AnomalyOut(BaseModel):
    month: str
    year: str
    result: float
    deviation: float  # quantos desvios-padrão o ponto está da média
    is_anomaly: bool


class YoyComparisonOut(BaseModel):
    month: str
    current_year: str
    current_value: float
    previous_year: str
    previous_value: float
    variation_pct: float | None = None
