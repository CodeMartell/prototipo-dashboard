"""
app/core/kpi_meta.py
Metadados dos indicadores usados por mais de uma camada: direcao do KPI
(quanto maior e melhor ou quanto menor e melhor), calculo de achievement
e validacao de periodo (month/year).

A direcao importa porque o achievement nao e a mesma conta para todos:
- custo (quanto menor melhor): achievement = target / result
- ganho/reducao (quanto maior melhor): achievement = result / target
"""
from __future__ import annotations

import re

VALID_MONTHS: tuple[str, ...] = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)

YEAR_PATTERN = re.compile(r"^Y\d{2}$")

# True  -> custo: bater a meta significa ficar abaixo dela.
# False -> ganho: bater a meta significa superar o valor previsto.
LOWER_IS_BETTER: dict[str, bool] = {
    "logistic_cost": True,      # War Room — custo logistico sobre faturamento
    "air_freight": True,        # Frete aereo sobre faturamento
    "demurrage": True,          # Sobrestadia de conteineres
    "total_cost": False,        # Task Cost Reduction — reducao alcancada
    "incidental_cost": False,   # Resin Consolidation — saving obtido
}


def validate_month(month: str) -> str:
    if month not in VALID_MONTHS:
        raise ValueError(f"month invalido: {month}. Validos: {', '.join(VALID_MONTHS)}")
    return month


def validate_year(year: str) -> str:
    if not YEAR_PATTERN.fullmatch(year):
        raise ValueError(f"year invalido: {year}. Use o formato YNN, por exemplo Y26")
    return year


def compute_achievement(kpi_type: str, target: float | None, result: float | None) -> float | None:
    """
    Calcula o atingimento da meta. Devolve None quando a conta nao faz
    sentido (divisao por zero sem equivalencia), para o dashboard mostrar
    "—" em vez de um numero inventado.
    """
    if target is None or result is None:
        return None

    lower_is_better = LOWER_IS_BETTER.get(kpi_type, True)
    numerator, denominator = (target, result) if lower_is_better else (result, target)

    if denominator == 0:
        # Meta zero atingida com resultado zero conta como 100%.
        return 1.0 if numerator == 0 else None

    return numerator / denominator


def compute_ratio(logistics_cost: float | None, production_amount: float | None) -> float | None:
    """Ratio de logistics_vs_prod: custo logistico sobre volume produzido."""
    if logistics_cost is None or production_amount in (None, 0):
        return None
    return logistics_cost / production_amount
