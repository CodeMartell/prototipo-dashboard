from pathlib import Path

from rpa_email.extractors.common import MONTHS, monthly_record, read_sheet


KPI_KEY = "logistic_cost"
DISPLAY_NAME = "War Room Report"


def extract(source: Path) -> list[dict]:
    """Extrai o Logistic Cost KPI TV do relatório War Room."""

    rows = read_sheet(source, "Logistic")
    tv_row = rows[67]
    if str(tv_row.get(0, "")).strip().upper() != "TV":
        raise ValueError("A linha 68 da aba Logistic não está identificada como TV")

    records = []
    for index, month in enumerate(MONTHS):
        result = tv_row.get(33 + index)
        if result is not None:
            records.append(monthly_record(month, "Y25", 0.0, result, lower_is_better=True))

    for index, month in enumerate(MONTHS):
        result = tv_row.get(72 + index)
        if result is not None:
            records.append(
                monthly_record(month, "Y26", tv_row.get(59 + index), result, lower_is_better=True)
            )
    return records
