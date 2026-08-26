"""
app/controllers/dashboard_controller.py
Endpoints de KPI. Só recebe requisição, valida entrada e devolve
resposta — nenhuma regra de negócio ou SQL aqui.

Protegido por autenticação: qualquer usuário logado pode ver os KPIs
(ADMIN) — não precisa de role específica,
só estar autenticado.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import KpiRecordOut, LogisticsVsProdOut
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/kpis", tags=["dashboard"], dependencies=[Depends(get_current_user)])


def _get_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(DashboardRepository(db))


@router.get("/{kpi_type}", response_model=list[KpiRecordOut])
def get_kpi(
    kpi_type: str,
    year: str | None = None,
    month: str | None = None,
    service: DashboardService = Depends(_get_service),
):
    return service.get_kpi(kpi_type, year=year, month=month)


@router.get("/{kpi_type}/historico", response_model=list[KpiRecordOut])
def get_kpi_history(kpi_type: str, service: DashboardService = Depends(_get_service)):
    return service.get_kpi(kpi_type, year=None, month=None)


@router.get("/extra/logistics-vs-prod", response_model=list[LogisticsVsProdOut])
def get_logistics_vs_prod(service: DashboardService = Depends(_get_service)):
    return service.get_logistics_vs_prod()
