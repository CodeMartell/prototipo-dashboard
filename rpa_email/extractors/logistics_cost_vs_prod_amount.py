from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from rpa_email.extractors.common import MONTHS, parse_number, read_sheet
from rpa_email.extractors.models import LogisticsVsProdRow


KPI_KEY = "logistics_vs_prod"
DISPLAY_NAME = "Logistics Cost x Prod Amount"


def _row(month: str, year: str, cost: object, production: object, ratio: object | None = None) -> LogisticsVsProdRow:
    logistics_cost = parse_number(cost)
    production_amount = parse_number(production)
    if logistics_cost < 0 or production_amount <= 0:
        raise ValueError(f"custo/produção inválido em {month}/{year}")
    ratio_value = parse_number(ratio) if ratio is not None else logistics_cost / production_amount
    if ratio_value < 0 or not math.isfinite(ratio_value):
        raise ValueError(f"razão inválida em {month}/{year}")
    return LogisticsVsProdRow(
        month=month,
        year=year,
        logistics_cost=round(logistics_cost, 4),
        production_amount=round(production_amount, 4),
        ratio=round(ratio_value, 6),
    )


def extract(source: Path) -> list[LogisticsVsProdRow]:
    """Extrai Cost x Prod Amount do relatório Incidental Cost_Total.

    O layout legado denomina o numerador como ``Incidental Cost`` na linha 82
    e o denominador como ``Prod. Amt.`` na linha 95 da aba de TV.
    """

    rows = read_sheet(source, "Incidental Cost (MUSD)")
    if len(rows) < 95:
        raise ValueError("A aba Incidental Cost (MUSD) não contém as linhas 82 e 95")
    cost_row = rows[81]
    production_row = rows[94]
    records = []
    periods = (
        ("Y25", MONTHS, 20),
        # O layout 26.07 publica Jan-Jul em AG:AM. As colunas seguintes
        # contêm controles/acumulados (incluindo marcadores como ``0x17``),
        # portanto não representam Ago-Dez.
        ("Y26", MONTHS[:7], 32),
    )
    for year, months, first_column in periods:
        for index, month in enumerate(months):
            cost = cost_row.get(first_column + index)
            production = production_row.get(first_column + index)
            # A fonte costuma trazer fórmulas/valores projetados na linha de
            # custo antes de publicar o Prod. Amt. do mês. Sem denominador o
            # período ainda não está fechado e deve ser ignorado.
            if production is None:
                continue
            if cost is None:
                raise ValueError(f"custo ausente em {month}/{year}")
            records.append(_row(month, year, cost, production))
    return records


def parse_normalized(
    raw: dict[str, Any], valid_months: set[str], valid_years: set[str]
) -> LogisticsVsProdRow | None:
    month = str(raw.get("month", "")).strip()
    year = str(raw.get("year", "")).strip()
    if month not in valid_months or year not in valid_years:
        return None
    try:
        return _row(
            month,
            year,
            raw.get("logisticsCost"),
            raw.get("productionAmount"),
            raw.get("ratio"),
        )
    except (TypeError, ValueError, ZeroDivisionError):
        return None
