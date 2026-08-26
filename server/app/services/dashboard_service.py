"""
app/services/dashboard_service.py
Lógica de negócio dos KPIs — decide como montar a resposta pro frontend.
Não faz SQL diretamente: sempre passa pelo DashboardRepository.
"""
from app.core.exceptions import DomainError
from app.models.kpi import KPI_MODEL_MAP
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import KpiRecordOut, LogisticsVsProdOut


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    def get_kpi(self, kpi_type: str, year: str | None, month: str | None) -> list[KpiRecordOut]:
        if kpi_type not in KPI_MODEL_MAP:
            valid = ", ".join(KPI_MODEL_MAP)
            raise DomainError(f"kpi_type inválido: {kpi_type}. Válidos: {valid}", status_code=422)

        records = self.repository.list_kpi_records(kpi_type, year=year, month=month)
        return [KpiRecordOut.model_validate(r) for r in records]

    def get_logistics_vs_prod(self) -> list[LogisticsVsProdOut]:
        records = self.repository.list_logistics_vs_prod()
        return [LogisticsVsProdOut.model_validate(r) for r in records]
