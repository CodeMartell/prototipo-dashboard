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
from app.models.permission import Permission, RolePermission
from app.models.user import User
from app.models.kpi import LogisticCost, LogisticsVsProd
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Mapa de permissões por role — espelha o seed_rbac.py
ROLE_PERMISSIONS = {
    "ADMIN": [
        "dashboard:read", "kpi:write_manual", "kpi:delete",
        "action_plans:read", "action_plans:write", "action_plans:delete",
        "users:read", "users:write", "users:assign_role",
        "audit:read_all", "audit:read_scoped",
    ],
    "GESTOR": [
        "dashboard:read", "kpi:write_manual", "kpi:delete",
        "action_plans:read", "action_plans:write", "action_plans:delete",
    ],
    "TI_SUPORTE": [
        "dashboard:read", "users:read", "users:write",
        "users:assign_role", "audit:read_scoped", "action_plans:read",
    ],
    "AUDITORIA": [
        "dashboard:read", "action_plans:read", "audit:read_all",
    ],
    "VIEWER": [
        "dashboard:read", "action_plans:read",
    ],
}


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
    user = SimpleNamespace(password_hash=hash_password("correct"), role=SimpleNamespace(name="VIEWER")) if exists else None
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
    ("post", "/api/users", {"email": "new@example.com", "name": "Test", "password": "password123", "role_name": "VIEWER"}),
    ("post", "/api/ingestion/kpi-report", {"email": {"message_id": "test", "subject": "Test", "sender": "test@example.com"}}),
    ("get", "/api/analysis/logistic_cost/anomalias", None),
])
def test_viewer_cannot_use_admin_routes(client, method, path, body):
    # VIEWER não tem users:write, kpi:write_manual, nem acesso a analytics
    token = create_access_token("test-user", {"role": "VIEWER", "permissions": ["dashboard:read", "action_plans:read"]})
    response = client.request(method, path, json=body, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


@pytest.fixture
def database_client():
    """Banco SQLite real em memória — valida autenticação e leitura ORM."""
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    with sessions() as db:
        # Criar permissões
        perm_map = {}
        all_perms = set()
        for perms in ROLE_PERMISSIONS.values():
            all_perms.update(perms)
        for code in all_perms:
            p = Permission(code=code)
            db.add(p)
            perm_map[code] = p
        db.flush()

        # Criar roles e associações
        role_map = {}
        for role_name, perm_codes in ROLE_PERMISSIONS.items():
            role = Role(name=role_name)
            db.add(role)
            db.flush()
            for code in perm_codes:
                db.add(RolePermission(role_id=role.id, permission_id=perm_map[code].id))
            role_map[role_name] = role

        admin = role_map["ADMIN"]
        viewer = role_map["VIEWER"]

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
        'email': 'new@example.com', 'password': 'test-password', 'name': 'Test User', 'role_name': 'VIEWER',
    })
    assert response.status_code == 201
    assert response.json()['role'] == 'VIEWER'
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
    assert response.json() == [{
        'month': 'Jan', 'year': 'Y26', 'target': 0.04, 'result': 0.05, 'achievement': 0.8,
        'source': 'rpa_email', 'submitted_by': None,
    }]
    response = client.get('/api/kpis/extra/logistics-vs-prod', headers=headers)
    assert response.status_code == 200
    assert response.json() == [{
        'month': 'Jan', 'year': 'Y26', 'logistics_cost': 1.5, 'production_amount': 30, 'ratio': 0.05,
        'source': 'rpa_email', 'submitted_by': None,
    }]
    assert client.get('/api/kpis/logistic_cost?month=Feb', headers=headers).json() == []



def test_persisted_viewer_cannot_create_users(database_client):
    client, sessions = database_client
    headers = login_headers(client, 'viewer@example.com')
    response = client.post('/api/users', headers=headers, json={
        'email': 'blocked@example.com', 'password': 'test-password', 'role_name': 'VIEWER',
    })
    assert response.status_code == 403
    with sessions() as db:
        assert db.scalar(select(User).where(User.email == 'blocked@example.com')) is None


def test_persisted_user_wrong_password(database_client):
    client, _ = database_client
    response = client.post('/api/auth/login', json={'email': 'admin@example.com', 'password': 'wrong'})
    assert response.status_code == 401
    assert 'access_token' not in response.json()

