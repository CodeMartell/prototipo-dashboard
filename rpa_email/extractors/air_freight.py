from pathlib import Path

from rpa_email.extractors.common import MONTHS, monthly_record, read_sheet


KPI_KEY = "air_freight"
DISPLAY_NAME = "Air Freight"


def extract(source: Path) -> list[dict]:
    rows = read_sheet(source, "Annual Result")
    tv_rate = rows[9]
    target = tv_rate.get(42)
    records = []
    for month, column in zip(MONTHS[:7], range(29, 36)):
        result = tv_rate.get(column)
        if result is None:
            continue
        records.append(monthly_record(month, "Y26", target, result, lower_is_better=True))
    return records
