from unittest.mock import Mock, MagicMock

import pytest
from pydantic import ValidationError

from app.schemas.ingestion_schema import IngestionPayload
from app.services.ingestion_service import IngestionService


def payload(**record_changes):
    record = dict(kpi_type="logistic_cost", month="Jan", year="Y26", target=0.04, result=0.05)
    record.update(record_changes)
    return {"email": {"message_id": "<test@example.com>", "subject": "KPI", "sender": "test@example.com"},
            "records": [record]}


def test_ingestion_queues_pending_item():
    dashboard, emails = Mock(), Mock()
    mock_db = MagicMock()
    dashboard.db = mock_db
    dashboard.list_kpi_records.return_value = []
    dashboard.list_logistics_vs_prod.return_value = []
    mock_db.scalars.return_value.first.return_value = None

    emails.exists.return_value = False
    result = IngestionService(dashboard, emails).ingest(IngestionPayload(**payload()))
    
    assert result["status"] == "pending"
    assert "queue_id" in result
    assert mock_db.add.called
    assert mock_db.commit.called


def test_partial_snapshot_is_rejected():
    data = payload()
    data["replace_kpis"] = ["air_freight"]

    with pytest.raises(ValidationError, match="replace_kpis"):
        IngestionPayload(**data)


def test_duplicate_email_does_not_write():
    dashboard, emails = Mock(), Mock()
    emails.exists.return_value = True
    assert IngestionService(dashboard, emails).ingest(IngestionPayload(**payload()))["status"] == "skipped"
    assert dashboard.mock_calls == []
    emails.create.assert_not_called()


@pytest.mark.parametrize("value", [None, "not-a-number"])
def test_invalid_required_number(value):
    with pytest.raises(ValidationError):
        IngestionPayload(**payload(result=value))


def test_missing_required_field():
    data = payload()
    del data["records"][0]["target"]
    with pytest.raises(ValidationError):
        IngestionPayload(**data)


@pytest.mark.parametrize("changes", [
    {"month": "January"}, {"year": "2026"}, {"target": -0.01},
    {"result": float("inf")}, {"achievement": float("nan")},
])
def test_invalid_period_or_non_finite_and_negative_values(changes):
    with pytest.raises(ValidationError):
        IngestionPayload(**payload(**changes))


def test_empty_payload_is_rejected():
    data = payload()
    data["records"] = []
    with pytest.raises(ValidationError):
        IngestionPayload(**data)


@pytest.mark.parametrize("field", ["message_id", "subject", "sender"])
def test_blank_email_metadata_is_rejected(field):
    data = payload()
    data["email"][field] = "   "
    with pytest.raises(ValidationError):
        IngestionPayload(**data)


def test_future_year_in_supported_format_is_accepted():
    parsed = IngestionPayload(**payload(year="Y30"))

    assert parsed.records[0].year == "Y30"
