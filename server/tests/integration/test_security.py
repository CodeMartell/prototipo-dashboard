"""Rotas reais com JWT/bcrypt reais; apenas o acesso ao banco é substituído."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import jwt
import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.dependencies import get_db
from app.core.security import create_access_token, hash_password, settings
from app.repositories.user_repository import UserRepository
from app.database.base import Base
from app.models.role import Role
from app.models.user import User
from app.models.kpi import LogisticCost, LogisticsVsProd
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client():
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: Mock()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def test_login_and_me(client, monkeypatch):
    user = SimpleNamespace(id="test-user", email="admin@example.com",
                           password_hash=hash_password("test-password"),
                           role=SimpleNamespace(name="ADMIN"))
    monkeypatch.setattr(UserRepository, "get_by_email", lambda self, email: user)
    response = client.post("/api/auth/login", json={"email": user.email, "password": "test-password"})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    me = client.get("/api/auth/me", headers={"Authorization": "Bearer " + response.json()["access_token"]})
    assert me.status_code == 200
    assert me.json()["email"] == user.email
    assert me.json()["role"] == "ADMIN"
    assert "password_hash" not in me.json()


@pytest.mark.parametrize("exists", [True, False])
def test_invalid_credentials(client, monkeypatch, exists):
    user = SimpleNamespace(password_hash=hash_password("correct")) if exists else None
    monkeypatch.setattr(UserRepository, "get_by_email", lambda self, email: user)
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "wrong"})
    assert response.status_code == 401
    assert "access_token" not in response.json()


@pytest.mark.parametrize("authorization", [None, "Basic abc", "Bearer invalid"])
def test_rejects_missing_or_invalid_token(client, authorization):
    headers = {"Authorization": authorization} if authorization else {}
    assert client.get("/api/kpis/logistic_cost", headers=headers).status_code == 401


def test_expired_token(client):
    token = jwt.encode({"sub": "test-user", "exp": datetime.now(timezone.utc) - timedelta(seconds=10)},
                       settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


@pytest.mark.parametrize("method,path,body", [
    ("post", "/api/users", {"email": "new@example.com", "name": "Test", "password": "password123", "role": "ADMIN"}),
    ("post", "/api/ingestion/kpi-report", {"email": {"message_id": "test", "subject": "Test", "sender": "test@example.com"}}),
    ("get", "/api/analysis/logistic_cost/anomalias", None),
])
def test_non_admin_cannot_use_admin_routes(client, method, path, body):
    # Perfil sintético: hoje somente ADMIN está implementado no cadastro.
    token = create_access_token("test-user", {"role": "VISUALIZADOR"})
    response = client.request(method, path, json=body, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


@pytest.fixture
def database_client():
    """Banco SQLite real em memória; não acessa DATABASE_URL nem caixa postal.

    Valida autenticação e leitura ORM, não o upsert específico do PostgreSQL.
    """
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        admin = Role(id='admin-role', name='ADMIN')
        viewer = Role(id='viewer-role', name='VISUALIZADOR')
        db.add_all([admin, viewer])
        for role, email in [(admin, 'admin@example.com'), (viewer, 'viewer@example.com')]:
            db.add(User(email=email, password_hash=hash_password('test-password'), role=role))
        db.add(LogisticCost(month='Jan', year='Y26', target=0.04, result=0.05, achievement=0.8))
        db.add(LogisticsVsProd(month='Jan', year='Y26', logistics_cost=1.5, production_amount=30, ratio=0.05))
        db.commit()

    def get_test_db():
        with sessions() as db:
            yield db

    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = get_test_db
    try:
        with TestClient(app) as test_client:
            yield test_client, sessions
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
        engine.dispose()


def login_headers(client, email):
    response = client.post('/api/auth/login', json={'email': email, 'password': 'test-password'})
    assert response.status_code == 200
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def test_persisted_admin_creates_user_and_new_user_can_login(database_client):
    client, sessions = database_client
    headers = login_headers(client, 'admin@example.com')
    response = client.post('/api/users', headers=headers, json={
        'email': 'new@example.com', 'password': 'test-password', 'name': 'Test User', 'role_name': 'VISUALIZADOR',
    })
    assert response.status_code == 201
    assert response.json()['role'] == 'VISUALIZADOR'
    with sessions() as db:
        user = db.scalar(select(User).where(User.email == 'new@example.com'))
        assert user is not None
        assert user.password_hash != 'test-password'
    new_headers = login_headers(client, 'new@example.com')
    assert client.get('/api/auth/me', headers=new_headers).json()['email'] == 'new@example.com'
    assert client.get('/api/analysis/logistic_cost/anomalias', headers=new_headers).status_code == 403


@pytest.mark.parametrize('email', ['admin@example.com', 'viewer@example.com'])
def test_persisted_users_read_kpi_contract(database_client, email):
    client, _ = database_client
    headers = login_headers(client, email)
    response = client.get('/api/kpis/logistic_cost?year=Y26&month=Jan', headers=headers)
    assert response.status_code == 200
    assert response.json() == [{'month': 'Jan', 'year': 'Y26', 'target': 0.04, 'result': 0.05, 'achievement': 0.8}]
    response = client.get('/api/kpis/extra/logistics-vs-prod', headers=headers)
    assert response.status_code == 200
    assert response.json() == [{'month': 'Jan', 'year': 'Y26', 'logistics_cost': 1.5, 'production_amount': 30, 'ratio': 0.05}]
    assert client.get('/api/kpis/logistic_cost?month=Feb', headers=headers).json() == []


def test_persisted_viewer_cannot_create_users(database_client):
    client, sessions = database_client
    headers = login_headers(client, 'viewer@example.com')
    response = client.post('/api/users', headers=headers, json={
        'email': 'blocked@example.com', 'password': 'test-password', 'role_name': 'ADMIN',
    })
    assert response.status_code == 403
    with sessions() as db:
        assert db.scalar(select(User).where(User.email == 'blocked@example.com')) is None


def test_persisted_user_wrong_password(database_client):
    client, _ = database_client
    response = client.post('/api/auth/login', json={'email': 'admin@example.com', 'password': 'wrong'})
    assert response.status_code == 401
    assert 'access_token' not in response.json()
