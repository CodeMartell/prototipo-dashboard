"""
app/services/dashboard_service.py
Lógica de negócio dos KPIs — decide como montar a resposta pro frontend.
Não faz SQL diretamente: sempre passa pelo DashboardRepository.
"""
from app.core.exceptions import DomainError
from app.core.kpi_meta import (
    compute_achievement,
    compute_ratio,
    validate_month,
    validate_year,
)
from app.models.kpi import KPI_MODEL_MAP
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    KpiRecordIn,
    KpiRecordOut,
    LogisticsVsProdIn,
    LogisticsVsProdOut,
    TaskCostSummaryOut,
)

# Regra 3.3.1 — Task Cost Reduction: agrupamento de meses por
# trimestre/semestre, igual ao que o frontend já usa (mesmos rótulos).
QUARTER_MONTHS: dict[str, list[str]] = {
    "Q1": ["Jan", "Feb", "Mar"],
    "Q2": ["Apr", "May", "Jun"],
    "Q3": ["Jul", "Aug", "Sep"],
    "Q4": ["Oct", "Nov", "Dec"],
}
SEMESTER_MONTHS: dict[str, list[str]] = {
    "H1": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "H2": ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    # ------------------------------------------------------------------
    # Leitura
    # ------------------------------------------------------------------

    def get_kpi(self, kpi_type: str, year: str | None, month: str | None) -> list[KpiRecordOut]:
        self._ensure_valid_kpi_type(kpi_type)
        records = self.repository.list_kpi_records(kpi_type, year=year, month=month)
        return [KpiRecordOut.model_validate(r) for r in records]

    def get_logistics_vs_prod(self) -> list[LogisticsVsProdOut]:
        records = self.repository.list_logistics_vs_prod()
        return [LogisticsVsProdOut.model_validate(r) for r in records]

    def get_dashboard(self) -> dict[str, list]:
        """
        Série completa de todos os indicadores numa só resposta — evita o
        frontend disparar seis requisições para montar a tela inicial.
        """
        payload: dict[str, list] = {
            kpi_type: self.get_kpi(kpi_type, year=None, month=None) for kpi_type in KPI_MODEL_MAP
        }
        payload["logistics_vs_prod"] = self.get_logistics_vs_prod()
        return payload

    def get_total_cost_summary(
        self, period: str, year: str, sub_period: str | None
    ) -> TaskCostSummaryOut:
        """
        Regra 3.3.1 (Task Cost Reduction): agregação por SOMA acumulada em
        Trimestral/Semestral/Anual — nunca média — e status sempre "good",
        já que qualquer valor de saving é positivo por natureza.
        """
        year = self._ensure_valid_year(year)
        records = self.repository.list_kpi_records("total_cost", year=year, month=None)

        if period == "monthly":
            month = validate_month(sub_period) if sub_period else None
            filtered = [r for r in records if month is None or r.month == month]
        elif period == "quarterly":
            months = QUARTER_MONTHS.get(sub_period or "", [])
            if not months:
                raise DomainError(
                    f"sub_period inválido para quarterly: {sub_period}. Válidos: {', '.join(QUARTER_MONTHS)}",
                    status_code=422,
                )
            filtered = [r for r in records if r.month in months]
        elif period == "semiannual":
            months = SEMESTER_MONTHS.get(sub_period or "", [])
            if not months:
                raise DomainError(
                    f"sub_period inválido para semiannual: {sub_period}. Válidos: {', '.join(SEMESTER_MONTHS)}",
                    status_code=422,
                )
            filtered = [r for r in records if r.month in months]
        elif period == "annual":
            filtered = list(records)
        else:
            raise DomainError(
                f"period inválido: {period}. Válidos: monthly, quarterly, semiannual, annual",
                status_code=422,
            )

        target_sum = sum(r.target for r in filtered) if filtered else None
        result_sum = sum(r.result for r in filtered) if filtered else None
        achievement = (
            compute_achievement("total_cost", target_sum, result_sum) if filtered else None
        )

        return TaskCostSummaryOut(
            period=period,
            year=year,
            sub_period=sub_period,
            target=target_sum,
            result=result_sum,
            achievement=achievement,
            status="good",  # regra 3.3.1: sempre verde, independente do valor
            months_included=[r.month for r in filtered],
        )

    # ------------------------------------------------------------------
    # Escrita manual (formulário do dashboard)
    # ------------------------------------------------------------------

    def save_kpi_record(
        self, kpi_type: str, year: str, month: str, payload: KpiRecordIn
    ) -> KpiRecordOut:
        self._ensure_valid_kpi_type(kpi_type)
        month, year = self._ensure_valid_period(month, year)

        achievement = payload.achievement
        if achievement is None:
            achievement = compute_achievement(kpi_type, payload.target, payload.result)

        self.repository.upsert_kpi_record(
            kpi_type=kpi_type,
            month=month,
            year=year,
            target=payload.target,
            result=payload.result,
            achievement=achievement,
        )
        self.repository.commit()

        return KpiRecordOut(
            month=month,
            year=year,
            target=payload.target,
            result=payload.result,
            achievement=achievement,
        )

    def save_logistics_vs_prod(
        self, year: str, month: str, payload: LogisticsVsProdIn
    ) -> LogisticsVsProdOut:
        month, year = self._ensure_valid_period(month, year)

        ratio = payload.ratio
        if ratio is None:
            ratio = compute_ratio(payload.logistics_cost, payload.production_amount)

        self.repository.upsert_logistics_vs_prod(
            month=month,
            year=year,
            logistics_cost=payload.logistics_cost,
            production_amount=payload.production_amount,
            ratio=ratio,
        )
        self.repository.commit()

        return LogisticsVsProdOut(
            month=month,
            year=year,
            logistics_cost=payload.logistics_cost,
            production_amount=payload.production_amount,
            ratio=ratio,
        )

    def delete_kpi_record(self, kpi_type: str, year: str, month: str) -> dict:
        """Remove o lançamento de um período — usado para desfazer input manual."""
        self._ensure_valid_kpi_type(kpi_type)
        month, year = self._ensure_valid_period(month, year)

        deleted = self.repository.delete_kpi_record(kpi_type, month=month, year=year)
        if not deleted:
            raise DomainError(
                f"Nenhum lançamento de {kpi_type} em {month}/{year} para remover.", status_code=404
            )
        self.repository.commit()
        return {"status": "deleted", "kpi_type": kpi_type, "month": month, "year": year}

    # ------------------------------------------------------------------
    # Validações
    # ------------------------------------------------------------------

    @staticmethod
    def _ensure_valid_kpi_type(kpi_type: str) -> None:
        if kpi_type not in KPI_MODEL_MAP:
            valid = ", ".join(KPI_MODEL_MAP)
            raise DomainError(f"kpi_type inválido: {kpi_type}. Válidos: {valid}", status_code=422)

    @staticmethod
    def _ensure_valid_period(month: str, year: str) -> tuple[str, str]:
        try:
            return validate_month(month), validate_year(year)
        except ValueError as exc:
            raise DomainError(str(exc), status_code=422) from exc

    @staticmethod
    def _ensure_valid_year(year: str) -> str:
        try:
            return validate_year(year)
        except ValueError as exc:
            raise DomainError(str(exc), status_code=422) from exc
