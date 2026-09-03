from unittest.mock import Mock, call

import pytest
from pydantic import ValidationError

from app.core.exceptions import DomainError
from app.schemas.ingestion_schema import IngestionPayload
from app.services.ingestion_service import IngestionService


def payload(**record_changes):
    record = dict(kpi_type="logistic_cost", month="Jan", year="Y26", target=0.04, result=0.05)
    record.update(record_changes)
    return {"email": {"message_id": "<test@example.com>", "subject": "KPI", "sender": "test@example.com"},
            "records": [record]}


def test_ingestion_persists_and_commits():
    dashboard, emails = Mock(), Mock()
    emails.exists.return_value = False
    result = IngestionService(dashboard, emails).ingest(IngestionPayload(**payload()))
    assert result == {"status": "processed", "kpi_records": 1, "logistics_vs_prod_records": 0}
    dashboard.upsert_kpi_record.assert_called_once_with(kpi_type="logistic_cost", month="Jan", year="Y26",
                                                      target=0.04, result=0.05, achievement=None)
    assert emails.create.call_args.args[0].message_id == "<test@example.com>"
    dashboard.commit.assert_called_once()


def test_snapshot_replaces_existing_indicator_before_upsert():
    dashboard, emails = Mock(), Mock()
    emails.exists.return_value = False
    data = payload()
    data["replace_kpis"] = ["logistic_cost"]

    IngestionService(dashboard, emails).ingest(IngestionPayload(**data))

    dashboard.delete_all_kpi_records.assert_called_once_with("logistic_cost")
    assert dashboard.method_calls[0] == call.delete_all_kpi_records("logistic_cost")


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


def test_unknown_kpi_does_not_commit():
    dashboard, emails = Mock(), Mock()
    emails.exists.return_value = False
    with pytest.raises(DomainError):
        IngestionService(dashboard, emails).ingest(IngestionPayload(**payload(kpi_type="unknown")))
    dashboard.commit.assert_not_called()
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
