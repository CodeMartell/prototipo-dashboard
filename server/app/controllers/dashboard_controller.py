"""
app/controllers/dashboard_controller.py
Endpoints de KPI. Só recebe requisição, valida entrada e devolve
resposta — nenhuma regra de negócio ou SQL aqui.

Leitura: qualquer usuário autenticado.
Escrita manual (PUT/DELETE): restrita ao perfil ADMIN, já que altera a
base que alimenta o dashboard.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    KpiRecordIn,
    KpiRecordOut,
    LogisticsVsProdIn,
    LogisticsVsProdOut,
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/kpis", tags=["dashboard"], dependencies=[Depends(get_current_user)])


def _get_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(DashboardRepository(db))


# ---------------------------------------------------------------------------
# Leitura
# ---------------------------------------------------------------------------


@router.get("/dashboard")
def get_dashboard(service: DashboardService = Depends(_get_service)):
    """Todos os indicadores de uma vez — payload que o dashboard consome."""
    return service.get_dashboard()


@router.get("/extra/logistics-vs-prod", response_model=list[LogisticsVsProdOut])
def get_logistics_vs_prod(service: DashboardService = Depends(_get_service)):
    return service.get_logistics_vs_prod()


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


# ---------------------------------------------------------------------------
# Escrita manual — formulário do dashboard
# ---------------------------------------------------------------------------


@router.put("/extra/logistics-vs-prod/{year}/{month}", response_model=LogisticsVsProdOut)
def upsert_logistics_vs_prod(
    year: str,
    month: str,
    payload: LogisticsVsProdIn,
    service: DashboardService = Depends(_get_service),
    _current_user: dict = Depends(require_role("ADMIN")),
):
    return service.save_logistics_vs_prod(year=year, month=month, payload=payload)


@router.put("/{kpi_type}/{year}/{month}", response_model=KpiRecordOut)
def upsert_kpi_record(
    kpi_type: str,
    year: str,
    month: str,
    payload: KpiRecordIn,
    service: DashboardService = Depends(_get_service),
    _current_user: dict = Depends(require_role("ADMIN")),
):
    """Cria ou atualiza o lançamento de um indicador num mês específico."""
    return service.save_kpi_record(kpi_type, year=year, month=month, payload=payload)


@router.delete("/{kpi_type}/{year}/{month}")
def delete_kpi_record(
    kpi_type: str,
    year: str,
    month: str,
    service: DashboardService = Depends(_get_service),
    _current_user: dict = Depends(require_role("ADMIN")),
):
    return service.delete_kpi_record(kpi_type, year=year, month=month)
