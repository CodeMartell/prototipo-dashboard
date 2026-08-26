"""
app/controllers/ingestion_controller.py
Porta de entrada dos dados extraídos pelo bot (Épico 2/3). O bot chama
esta rota via HTTP em vez de escrever direto no Postgres .
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.processed_email_repository import ProcessedEmailRepository
from app.schemas.ingestion_schema import IngestionPayload
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


@router.post("/kpi-report")
def ingest_kpi_report(
    payload: IngestionPayload,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_role("ADMIN")),
):
    service = IngestionService(DashboardRepository(db), ProcessedEmailRepository(db))
    return service.ingest(payload)
