from unittest.mock import MagicMock
import pytest
from app.services.ingestion_apply_service import IngestionApplyService
from app.models.email_ingest_queue import EmailIngestQueue
from app.core.exceptions import DomainError


def test_accept_ingestion_not_found():
    db = MagicMock()
    dashboard_repo = MagicMock()
    processed_email_repo = MagicMock()

    db.scalars.return_value.first.return_value = None

    service = IngestionApplyService(db, dashboard_repo, processed_email_repo)
    with pytest.raises(DomainError, match="não encontrado"):
        service.accept_ingestion("non-existent-id", {"id": "user-1", "email": "admin@example.com"})


def test_accept_ingestion_success():
    db = MagicMock()
    dashboard_repo = MagicMock()
    processed_email_repo = MagicMock()

    queue_item = EmailIngestQueue(
        id="queue-123",
        message_id="<msg-123@domain.com>",
        subject="Report Jan",
        sender="bot@domain.com",
        status="PENDING",
        payload_raw={
            "records": [
                {"kpi_type": "logistic_cost", "month": "Jan", "year": "Y26", "target": 0.05, "result": 0.04}
            ],
            "logistics_vs_prod": [],
            "replace_kpis": [],
        },
        diff_snapshot=[],
    )
    db.scalars.return_value.first.return_value = queue_item
    processed_email_repo.exists.return_value = False
    dashboard_repo.list_kpi_records.return_value = []

    service = IngestionApplyService(db, dashboard_repo, processed_email_repo)
    result = service.accept_ingestion("queue-123", {"id": "admin-1", "email": "admin@example.com"})

    assert result["status"] == "success"
    assert queue_item.status == "ACCEPTED"
    assert dashboard_repo.upsert_kpi_record.called
    assert db.commit.called


def test_reject_ingestion_success():
    db = MagicMock()
    dashboard_repo = MagicMock()
    processed_email_repo = MagicMock()

    queue_item = EmailIngestQueue(
        id="queue-456",
        message_id="<msg-456@domain.com>",
        subject="Report Feb",
        sender="bot@domain.com",
        status="PENDING",
    )
    db.scalars.return_value.first.return_value = queue_item

    service = IngestionApplyService(db, dashboard_repo, processed_email_repo)
    result = service.reject_ingestion("queue-456", "Planilha incorreta", {"id": "admin-1", "email": "admin@example.com"})

    assert result["status"] == "success"
    assert queue_item.status == "REJECTED"
    assert queue_item.reject_reason == "Planilha incorreta"
    assert db.commit.called
