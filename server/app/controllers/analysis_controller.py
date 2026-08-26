"""
app/controllers/analysis_controller.py
Endpoints de análise: anomalia e comparação ano a ano (YoY).
Busca os dados via DashboardService e calcula via AnalysisService.

Protegido por ADMIN (único perfil existente hoje). Se o time criar
outros perfis no futuro (GESTOR, VISUALIZADOR), ajustar aqui.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.analysis_schema import AnomalyOut, YoyComparisonOut
from app.services.analysis_service import AnalysisService
from app.services.dashboard_service import DashboardService

router = APIRouter(
    prefix="/api/analysis",
    tags=["analysis"],
    dependencies=[Depends(require_role("ADMIN"))],
)


def _get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(DashboardRepository(db))


@router.get("/{kpi_type}/anomalias", response_model=list[AnomalyOut])
def get_anomalies(
    kpi_type: str,
    dashboard_service: DashboardService = Depends(_get_dashboard_service),
):
    records = dashboard_service.get_kpi(kpi_type, year=None, month=None)
    return AnalysisService().detect_anomalies(records)


@router.get("/{kpi_type}/yoy", response_model=list[YoyComparisonOut])
def get_year_over_year(
    kpi_type: str,
    current_year: str,
    previous_year: str,
    dashboard_service: DashboardService = Depends(_get_dashboard_service),
):
    current = dashboard_service.get_kpi(kpi_type, year=current_year, month=None)
    previous = dashboard_service.get_kpi(kpi_type, year=previous_year, month=None)
    return AnalysisService().compare_year_over_year(current, previous)
