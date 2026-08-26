"""
app/services/analysis_service.py
Cálculos sobre dados já buscados pelo DashboardService — sem acesso a
banco aqui (por isso não existe analysis_repository.py).
"""
import statistics

from app.schemas.analysis_schema import AnomalyOut, YoyComparisonOut
from app.schemas.dashboard_schema import KpiRecordOut

ANOMALY_THRESHOLD_STD_DEV = 2.0


class AnalysisService:
    def detect_anomalies(self, records: list[KpiRecordOut]) -> list[AnomalyOut]:
        """
        Marca como anomalia todo ponto com desvio > 2 sigma da média —
        calculada SEM o próprio ponto (leave-one-out). Isso evita que um
        outlier "puxe" a média/desvio-padrão pra cima e acabe mascarando
        o próprio desvio dele (problema comum com amostras pequenas).
        """
        if len(records) < 3:
            return []

        results: list[AnomalyOut] = []
        for i, record in enumerate(records):
            other_values = [r.result for j, r in enumerate(records) if j != i]
            mean = statistics.fmean(other_values)
            std_dev = statistics.pstdev(other_values)

            deviation = 0.0 if std_dev == 0 else abs(record.result - mean) / std_dev
            results.append(
                AnomalyOut(
                    month=record.month,
                    year=record.year,
                    result=record.result,
                    deviation=round(deviation, 2),
                    is_anomaly=deviation > ANOMALY_THRESHOLD_STD_DEV,
                )
            )
        return results

    def compare_year_over_year(
        self, current_year_records: list[KpiRecordOut], previous_year_records: list[KpiRecordOut]
    ) -> list[YoyComparisonOut]:
        """Compara mês a mês dois anos (ex: 2026 vs 2025)."""
        previous_by_month = {r.month: r for r in previous_year_records}

        comparisons: list[YoyComparisonOut] = []
        for current in current_year_records:
            previous = previous_by_month.get(current.month)
            if previous is None:
                continue

            variation_pct = None
            if previous.result != 0:
                variation_pct = round(((current.result - previous.result) / previous.result) * 100, 2)

            comparisons.append(
                YoyComparisonOut(
                    month=current.month,
                    current_year=current.year,
                    current_value=current.result,
                    previous_year=previous.year,
                    previous_value=previous.result,
                    variation_pct=variation_pct,
                )
            )
        return comparisons
