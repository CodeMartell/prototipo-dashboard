import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.dependencies import get_current_user, get_db
from app.database.base import Base
from app.models.evidence import Evidence


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def auth_user():
    return {
        "id": "usr-test-123",
        "email": "analista@teste.com",
        "role": "ANALISTA",
    }


@pytest.fixture
def client(db_session, auth_user):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: auth_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_list_evidences_empty(client):
    res = client.get("/api/evidences?kpi_key=logistic_cost&year=2026&period=Jan")
    assert res.status_code == 200
    assert res.json() == []


def test_upload_and_download_evidence(client):
    file_content = b"fake pptx content for presentation testing"
    files = {"file": ("apresentacao_teste.pptx", io.BytesIO(file_content), "application/vnd.openxmlformats-officedocument.presentationml.presentation")}

    res = client.post(
        "/api/evidences?kpi_key=logistic_cost&year=2026&period=Jan",
        files=files,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "apresentacao_teste.pptx"
    evidence_id = data["id"]

    # Listar
    list_res = client.get("/api/evidences?kpi_key=logistic_cost&year=2026&period=Jan")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == evidence_id

    # Download
    download_res = client.get(f"/api/evidences/{evidence_id}/download")
    assert download_res.status_code == 200
    assert download_res.content == file_content
    assert 'attachment; filename="apresentacao_teste.pptx"' in download_res.headers.get("content-disposition", "")

    # Excluir
    delete_res = client.delete(f"/api/evidences/{evidence_id}")
    assert delete_res.status_code == 204

    # Confirmar exclusão
    list_after = client.get("/api/evidences?kpi_key=logistic_cost&year=2026&period=Jan")
    assert list_after.status_code == 200
    assert len(list_after.json()) == 0


def test_upload_rejects_invalid_extension(client):
    files = {"file": ("arquivo_invalido.exe", io.BytesIO(b"executavel"), "application/octet-stream")}
    res = client.post(
        "/api/evidences?kpi_key=logistic_cost&year=2026&period=Jan",
        files=files,
    )
    assert res.status_code == 400
    assert "PowerPoint" in res.json()["detail"]
