"""
tests/unit/test_analysis_service.py
Teste unitário puro — não toca banco, só testa o cálculo de anomalia.
Obrigatório passar antes de deploy, conforme o guia (seção 10.3).
"""
from app.schemas.dashboard_schema import KpiRecordOut
from app.services.analysis_service import AnalysisService


def _record(month: str, year: str, result: float) -> KpiRecordOut:
    return KpiRecordOut(month=month, year=year, target=0, result=result, achievement=None)


def test_detect_anomalies_flags_outlier():
    records = [
        _record("Jan", "2026", 10),
        _record("Fev", "2026", 11),
        _record("Mar", "2026", 9),
        _record("Abr", "2026", 100),  # outlier claro
    ]

    anomalies = AnalysisService().detect_anomalies(records)
    abril = next(a for a in anomalies if a.month == "Abr")
    janeiro = next(a for a in anomalies if a.month == "Jan")

    assert abril.is_anomaly is True
    assert janeiro.is_anomaly is False  # meses normais não devem ser marcados


def test_detect_anomalies_needs_at_least_three_points():
    records = [_record("Jan", "2026", 10), _record("Fev", "2026", 11)]
    assert AnalysisService().detect_anomalies(records) == []


def test_detect_anomalies_empty_input_returns_empty_list():
    assert AnalysisService().detect_anomalies([]) == []


def test_compare_year_over_year_calculates_variation_pct():
    current = [_record("Jan", "2026", 110)]
    previous = [_record("Jan", "2025", 100)]

    result = AnalysisService().compare_year_over_year(current, previous)

    assert result[0].variation_pct == 10.0
