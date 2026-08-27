import pytest
from flask import Flask

from api_server.core.config import AppConfig
from api_server.repositories.base import KpiRepositoryInterface
from api_server.services.kpi_service import KpiService
from api_server.routes.dashboard_routes import dashboard_bp


class MockKpiRepository(KpiRepositoryInterface):
    def __init__(self, available=True, data=None):
        self._available = available
        self._data = data or {
            "logistic_cost": [
                {"month": "Jan", "year": "Y26", "target": 0.04, "result": 0.038, "achievement": 1.05}
            ],
            "air_freight": [],
            "logistics_vs_prod": [],
        }

    def is_available(self) -> bool:
        return self._available

    def fetch_all(self):
        return self._data


@pytest.fixture
def app():
    test_app = Flask(__name__)
    mock_pg = MockKpiRepository(available=True)
    mock_excel = MockKpiRepository(available=False)
    service = KpiService(mock_pg, mock_excel)

    test_app.config["KPI_SERVICE"] = service
    test_app.register_blueprint(dashboard_bp)
    test_app.config["TESTING"] = True
    return test_app


@pytest.fixture
def client(app):
    return app.test_client()


def test_health_route(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["status"] == "ok"
    assert json_data["source"] == "postgresql"
    assert json_data["postgres_connected"] is True


def test_dashboard_route_returns_kpis(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    json_data = response.get_json()
    assert "logistic_cost" in json_data
    assert len(json_data["logistic_cost"]) == 1
    assert json_data["logistic_cost"][0]["month"] == "Jan"


def test_fallback_to_excel():
    mock_pg = MockKpiRepository(available=False)
    mock_excel = MockKpiRepository(available=True, data={"total_cost": [{"month": "Feb", "year": "Y26"}]})
    service = KpiService(mock_pg, mock_excel)

    data, source = service.get_dashboard_data()
    assert source == "excel_cache"
    assert "total_cost" in data
    assert data["total_cost"][0]["month"] == "Feb"
