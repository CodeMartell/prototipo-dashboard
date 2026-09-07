from pathlib import Path

from rpa_email.extractors.common import MONTHS, monthly_record, parse_number, read_sheet


KPI_KEY = "air_freight"
DISPLAY_NAME = "Air Freight"


def _annual_record(year: str, target: object, result: object) -> dict:
    """
    Cria um registro de granularidade anual para AIR Freight.

    Anos 2024 e 2025 não possuem decomposição mensal no relatório;
    apenas o acumulado anual está disponível.  Usamos month='Annual'
    como sentinela para que o frontend saiba exibir o valor sem tentar
    decompor em meses.
    """
    target_value = parse_number(target) if target is not None else 0.0
    result_value = parse_number(result)
    # lowerIsBetter=False: achievement = result / target (≥ 100% = verde)
    achievement = (
        round(result_value / target_value, 4)
        if target_value > 0
        else None
    )
    return {
        "month": "Annual",
        "year": year,
        "target": target_value,
        "result": result_value,
        "achievement": achievement,
    }


def extract(source: Path) -> list[dict]:
    """
    Extrai o KPI Air Freight do relatório.

    Granularidade:
    - Y26 (2026): dados mensais, Jan–Jul disponíveis (colunas 29–35, linha 9).
    - Y24 (2024): somente acumulado anual (coluna P = índice 15).
    - Y25 (2025): somente acumulado anual (coluna AC = índice 28).

    Referência de colunas (0-based, aba "Annual Result"):
      - Col 15 (P)  → Y24 acumulado
      - Col 28 (AC) → Y25 acumulado
      - Col 42      → target Y26
      - Cols 29–35  → resultado Y26 Jan–Jul
    """
    rows = read_sheet(source, "Annual Result")
    tv_rate = rows[9]

    records: list[dict] = []

    # ── Y26: granularidade mensal ──────────────────────────────────────────
    target_y26 = tv_rate.get(42)
    for month, column in zip(MONTHS[:7], range(29, 36)):
        result = tv_rate.get(column)
        if result is None:
            continue
        records.append(monthly_record(month, "Y26", target_y26, result, lower_is_better=False))

    # ── Y24: somente acumulado anual (coluna P = índice 15) ────────────────
    result_y24 = tv_rate.get(15)
    target_y24 = tv_rate.get(42)   # reutiliza target Y26 como referência ou None
    if result_y24 is not None:
        try:
            records.append(_annual_record("Y24", target_y24, result_y24))
        except (ValueError, TypeError):
            pass  # valor inválido: ignorar silenciosamente

    # ── Y25: somente acumulado anual (coluna AC = índice 28) ───────────────
    result_y25 = tv_rate.get(28)
    if result_y25 is not None:
        try:
            records.append(_annual_record("Y25", target_y24, result_y25))
        except (ValueError, TypeError):
            pass

    return records
