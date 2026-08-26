"""
tests/integration/test_health.py
Teste de integração simples — sobe a app via TestClient e checa /api/health.
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
