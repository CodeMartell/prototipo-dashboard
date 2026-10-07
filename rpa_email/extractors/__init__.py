"""Extratores de KPI, organizados pelos nomes usados na API e no dashboard."""

from rpa_email.extractors.models import ExtractionResult, KpiMonthlyRow, LogisticsVsProdRow
from rpa_email.extractors.normalized import KpiExtractor
from rpa_email.extractors.raw import RawReportExtractor, is_raw_report

__all__ = [
    "ExtractionResult",
    "KpiExtractor",
    "KpiMonthlyRow",
    "LogisticsVsProdRow",
    "RawReportExtractor",
    "is_raw_report",
]
