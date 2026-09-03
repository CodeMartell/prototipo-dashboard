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
)


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
