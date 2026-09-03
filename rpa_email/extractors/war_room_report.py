from pathlib import Path

from rpa_email.extractors.common import MONTHS, monthly_record, parse_number, read_sheet


KPI_KEY = "logistic_cost"
DISPLAY_NAME = "War Room Report"


def extract(source: Path) -> list[dict]:
    """Extrai o Logistic Cost KPI TV do relatório War Room."""

    rows = read_sheet(source, "Logistic")
    tv_row = rows[67]
    if str(tv_row.get(0, "")).strip().upper() != "TV":
        raise ValueError("A linha 68 da aba Logistic não está identificada como TV")

    records = []

    # U:AF = 24Y Result; AH:AS = 25Y Result. Esses blocos não possuem
    # target na fonte, portanto 0 é apenas o valor técnico do contrato da API.
    for year, first_column in (("Y24", 20), ("Y25", 33)):
        for index, month in enumerate(MONTHS):
            result = tv_row.get(first_column + index)
            if result is None:
                continue
            result_value = parse_number(result)
            if result_value == 0:
                continue
            records.append(monthly_record(month, year, 0.0, result_value, lower_is_better=True))

    # BH:BS = 26Y Target; BU:CF = 26Y Result. Zero no bloco de resultado
    # significa mês ainda não publicado, não custo logístico igual a zero.
    for index, month in enumerate(MONTHS):
        result = tv_row.get(72 + index)
        if result is None:
            continue
        result_value = parse_number(result)
        if result_value == 0:
            continue
        records.append(
            monthly_record(month, "Y26", tv_row.get(59 + index), result_value, lower_is_better=True)
        )
    return records
