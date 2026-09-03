"""Anexos sintéticos: sem acesso a caixa postal ou arquivos de usuários."""
from email.message import EmailMessage

import openpyxl
import pytest

from rpa_email.extractors import KpiExtractor
from rpa_email.extractors.normalized import _parse_kpi_row
from rpa_email.email_client import EmailClient


@pytest.mark.parametrize(
    "kpi, expected_achievement",
    [
        ("logistic_cost", 0.8),
        ("air_freight", 0.8),
        ("incidental_cost", 1.25),
        ("total_cost", 1.25),
        ("demurrage", 0.8),
    ],
)
def test_email_attachment_to_extracted_kpi(tmp_path, kpi, expected_achievement):
    source = tmp_path / f"{kpi}.xlsx"
    workbook = openpyxl.Workbook()
    workbook.active.append(["month", "year", "target", "result", "achievement"])
    workbook.active.append(["Jan", "Y26", 0.04, 0.05, None])
    workbook.save(source)
    workbook.close()
    message = EmailMessage()
    message.set_content("Relatório de teste")
    message.add_attachment(source.read_bytes(), maintype="application", subtype="octet-stream", filename=source.name)
    destination = tmp_path / "attachments"
    assert EmailClient.save_attachments(message, destination) == 1
    extracted = KpiExtractor(destination).extract()
    assert extracted.errors == []
    rows = getattr(extracted, kpi)
    assert len(rows) == 1
    assert (rows[0].month, rows[0].year) == ("Jan", "Y26")
    assert rows[0].result == pytest.approx(0.05)
    assert rows[0].achievement == pytest.approx(expected_achievement)


@pytest.mark.parametrize("changes", [{"month": "invalid"}, {"year": "invalid"}, {"target": None}, {"result": "abc"}])
def test_invalid_rows_are_ignored(changes):
    row = dict(month="Jan", year="Y26", target=0.04, result=0.05)
    row.update(changes)
    assert _parse_kpi_row(row, "logistic_cost") is None


def test_corrupt_attachment_is_reported(tmp_path):
    (tmp_path / "logistic_cost.xlsx").write_bytes(b"not an Excel file")
    result = KpiExtractor(tmp_path).extract()
    assert len(result.errors) == 1
    assert "logistic_cost.xlsx" in result.errors[0]
    assert result.logistic_cost == []


def test_empty_folder(tmp_path):
    result = KpiExtractor(tmp_path).extract()
    assert result.logistic_cost == []
    assert result.errors == []


def _write_logistic_workbook(path, headers, rows):
    workbook = openpyxl.Workbook()
    workbook.active.append(headers)
    for row in rows:
        workbook.active.append(row)
    workbook.save(path)
    workbook.close()


def test_missing_required_column_rejects_entire_file(tmp_path):
    _write_logistic_workbook(
        tmp_path / "logistic_cost.xlsx",
        ["month", "year", "result", "achievement"],
        [["Jan", "Y26", 0.05, 0.8]],
    )
    result = KpiExtractor(tmp_path).extract()
    assert result.logistic_cost == []
    assert result.errors == [
        "logistic_cost.xlsx [Sheet]: colunas obrigatórias ausentes: target"
    ]


@pytest.mark.parametrize("invalid", ["texto", None, -0.01, float("inf"), float("nan")])
def test_invalid_number_rejects_entire_batch(tmp_path, invalid):
    _write_logistic_workbook(
        tmp_path / "logistic_cost.xlsx",
        ["month", "year", "target", "result", "achievement"],
        [["Jan", "Y26", 0.04, 0.05, 0.8], ["Feb", "Y26", 0.04, invalid, 0.8]],
    )
    result = KpiExtractor(tmp_path).extract()
    assert result.logistic_cost == []
    assert len(result.errors) == 1
    assert "linha 3: dados inválidos" in result.errors[0]


def test_header_only_workbook_is_rejected(tmp_path):
    _write_logistic_workbook(
        tmp_path / "logistic_cost.xlsx",
        ["month", "year", "target", "result", "achievement"],
        [],
    )
    result = KpiExtractor(tmp_path).extract()
    assert result.logistic_cost == []
    assert result.errors == ["logistic_cost.xlsx [Sheet]: planilha sem registros"]


def test_higher_is_better_achievement_uses_result_over_target(tmp_path):
    _write_logistic_workbook(
        tmp_path / "total_cost.xlsx",
        ["month", "year", "target", "result", "achievement"],
        [["Jan", "Y26", 100, 120, None]],
    )
    result = KpiExtractor(tmp_path).extract()
    assert result.errors == []
    assert result.total_cost[0].achievement == pytest.approx(1.2)
