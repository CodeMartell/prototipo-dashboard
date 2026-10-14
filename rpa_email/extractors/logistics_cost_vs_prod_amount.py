from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any

from rpa_email.extractors.common import MONTHS, parse_number, read_sheet
from rpa_email.extractors.models import LogisticsVsProdRow


KPI_KEY = "logistics_vs_prod"
DISPLAY_NAME = "Incidental Cost"

RATIO_ABSOLUTE_TOLERANCE = 0.0005
FIRST_DATA_YEAR = 2024
YEAR_MONTH_PATTERN = re.compile(r"^(\d{4})-(\d{2})$")


def _period_columns(header_row: dict[int, Any]) -> list[tuple[int, str, str]]:
    periods = []
    for column, raw_period in header_row.items():
        match = YEAR_MONTH_PATTERN.fullmatch(str(raw_period).strip())
        if not match:
            continue
        year, month_number = map(int, match.groups())
        if year < FIRST_DATA_YEAR or not 1 <= month_number <= 12:
            continue
        periods.append((column, f"Y{str(year)[-2:]}", MONTHS[month_number - 1]))
    if not periods:
        raise ValueError("nenhum período mensal válido encontrado na linha 6")
    return sorted(periods)


def _row(month: str, year: str, cost: object, production: object, ratio: object | None = None) -> LogisticsVsProdRow:
    logistics_cost = parse_number(cost)
    production_amount = parse_number(production)
    if logistics_cost < 0 or production_amount <= 0:
        raise ValueError(f"custo/produção inválido em {month}/{year}")

    ratio_value = logistics_cost / production_amount
    if ratio_value < 0 or not math.isfinite(ratio_value):
        raise ValueError(f"razão inválida em {month}/{year}")

    if ratio is not None:
        reported_ratio = parse_number(ratio)
        if reported_ratio < 0 or not math.isfinite(reported_ratio):
            raise ValueError(f"percentual informado inválido em {month}/{year}")
        if not math.isclose(
            ratio_value,
            reported_ratio,
            rel_tol=0.0,
            abs_tol=RATIO_ABSOLUTE_TOLERANCE,
        ):
            raise ValueError(
                f"percentual divergente em {month}/{year}: "
                f"calculado={ratio_value:.6f}, informado={reported_ratio:.6f}"
            )

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
    if len(rows) < 96:
        raise ValueError("A aba Incidental Cost (MUSD) não contém as linhas 82, 95 e 96")
    header_row = rows[5]
    cost_row = rows[81]
    production_row = rows[94]
    reported_ratio_row = rows[95]
    records = []
    for column, year, month in _period_columns(header_row):
        cost = cost_row.get(column)
        production = production_row.get(column)
        reported_ratio = reported_ratio_row.get(column)
        # A fonte costuma trazer fórmulas/valores projetados na linha de
        # custo antes de publicar o Prod. Amt. do mês. Sem denominador o
        # período ainda não está fechado e deve ser ignorado.
        if production is None:
            continue
        if cost is None:
            raise ValueError(f"custo ausente em {month}/{year}")
        if reported_ratio is None:
            raise ValueError(f"percentual ausente em {month}/{year}")
        records.append(_row(month, year, cost, production, reported_ratio))
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
