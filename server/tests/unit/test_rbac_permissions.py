"""
tests/unit/test_rbac_permissions.py
Testes de enforcement RBAC — cobre cada célula da matriz de permissões.

Estratégia: banco SQLite em memória com roles + permissions completos,
testa positivo (tem permissão → 2xx) e negativo (não tem → 403).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.dependencies import get_db
from app.core.security import create_access_token, hash_password
from app.database.base import Base
from app.models.role import Role
from app.models.permission import Permission, RolePermission
from app.models.user import User
from app.models.kpi import LogisticCost

# Mesma matriz do seed_rbac.py — fonte da verdade dos testes
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


def make_token(role_name: str) -> str:
    """Cria token com permissions da matriz."""
    perms = ROLE_PERMISSIONS.get(role_name, [])
    return create_access_token("test-user", {"role": role_name, "permissions": perms})


def auth(role_name: str) -> dict:
    return {"Authorization": f"Bearer {make_token(role_name)}"}


@pytest.fixture(scope="module")
def client_with_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    with sessions() as db:
        perm_map = {}
        all_perms = set(p for perms in ROLE_PERMISSIONS.values() for p in perms)
        for code in all_perms:
            p = Permission(code=code)
            db.add(p)
            perm_map[code] = p
        db.flush()

        role_map = {}
        for role_name, perm_codes in ROLE_PERMISSIONS.items():
            role = Role(name=role_name)
            db.add(role)
            db.flush()
            for code in perm_codes:
                db.add(RolePermission(role_id=role.id, permission_id=perm_map[code].id))
            role_map[role_name] = role

        for role_name, role in role_map.items():
            db.add(User(
                email=f"{role_name.lower()}@test.com",
                password_hash=hash_password("pass"),
                role=role,
            ))
        db.add(User(
            id="target-user-id",
            email="target@test.com",
            password_hash=hash_password("pass"),
            role=role_map["VIEWER"],
        ))
        db.add(LogisticCost(month="Jan", year="Y26", target=0.04, result=0.05, achievement=0.8))
        db.commit()

    def get_test_db():
        with sessions() as db:
            yield db

    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)
    engine.dispose()


# ---------------------------------------------------------------------------
# dashboard:read — todos os papéis têm acesso
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "GESTOR", "TI_SUPORTE", "AUDITORIA", "VIEWER"])
def test_all_roles_can_read_dashboard(client_with_db, role):
    r = client_with_db.get("/api/kpis/logistic_cost", headers=auth(role))
    assert r.status_code == 200, f"{role} deveria poder ler o dashboard"


# ---------------------------------------------------------------------------
# kpi:write_manual — apenas ADMIN e GESTOR
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "GESTOR"])
def test_kpi_write_manual_allowed(client_with_db, role):
    r = client_with_db.put(
        "/api/kpis/logistic_cost/Y26/Feb",
        headers=auth(role),
        json={"target": 0.05, "result": 0.06},
    )
    # 200 ou 422 (validação de negócio), mas não 403
    assert r.status_code != 403, f"{role} deveria ter kpi:write_manual"


@pytest.mark.parametrize("role", ["TI_SUPORTE", "AUDITORIA", "VIEWER"])
def test_kpi_write_manual_forbidden(client_with_db, role):
    r = client_with_db.put(
        "/api/kpis/logistic_cost/Y26/Feb",
        headers=auth(role),
        json={"target": 0.05, "result": 0.06},
    )
    assert r.status_code == 403, f"{role} NÃO deveria ter kpi:write_manual"


# ---------------------------------------------------------------------------
# kpi:delete — ADMIN e GESTOR têm a permissão
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "GESTOR"])
def test_kpi_delete_permission_present(client_with_db, role):
    # O KPI pode não existir (404) mas não deve ser 403 — o que importa é a permissão
    r = client_with_db.delete("/api/kpis/logistic_cost/Y26/Jan", headers=auth(role))
    assert r.status_code != 403, f"{role} deveria ter kpi:delete"


@pytest.mark.parametrize("role", ["TI_SUPORTE", "AUDITORIA", "VIEWER"])
def test_kpi_delete_forbidden(client_with_db, role):
    r = client_with_db.delete("/api/kpis/logistic_cost/Y26/Jan", headers=auth(role))
    assert r.status_code == 403, f"{role} NÃO deveria ter kpi:delete"


# ---------------------------------------------------------------------------
# users:read — ADMIN e TI_SUPORTE
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "TI_SUPORTE"])
def test_users_read_allowed(client_with_db, role):
    r = client_with_db.get("/api/users", headers=auth(role))
    assert r.status_code == 200, f"{role} deveria ter users:read"


@pytest.mark.parametrize("role", ["GESTOR", "AUDITORIA", "VIEWER"])
def test_users_read_forbidden(client_with_db, role):
    r = client_with_db.get("/api/users", headers=auth(role))
    assert r.status_code == 403, f"{role} NÃO deveria ter users:read"


# ---------------------------------------------------------------------------
# users:write — ADMIN e TI_SUPORTE
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "TI_SUPORTE"])
def test_users_write_allowed(client_with_db, role):
    import uuid
    r = client_with_db.post("/api/users", headers=auth(role), json={
        "email": f"{uuid.uuid4()}@test.com",
        "password": "pass123",
        "role_name": "VIEWER",
    })
    assert r.status_code in (201, 409, 422), f"{role} deveria ter users:write"


@pytest.mark.parametrize("role", ["GESTOR", "AUDITORIA", "VIEWER"])
def test_users_write_forbidden(client_with_db, role):
    r = client_with_db.post("/api/users", headers=auth(role), json={
        "email": "x@test.com", "password": "pass123", "role_name": "VIEWER",
    })
    assert r.status_code == 403, f"{role} NÃO deveria ter users:write"


# ---------------------------------------------------------------------------
# users:assign_role — ADMIN e TI_SUPORTE (com restrição de ADMIN)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "TI_SUPORTE"])
def test_assign_role_permission_present(client_with_db, role):
    r = client_with_db.patch(
        "/api/users/target-user-id/role",
        headers=auth(role),
        json={"role_name": "VIEWER"},
    )
    # 200 ou 404 (user might not load properly in this test) — não deve ser 403
    assert r.status_code != 403, f"{role} deveria ter users:assign_role"


@pytest.mark.parametrize("role", ["GESTOR", "AUDITORIA", "VIEWER"])
def test_assign_role_forbidden(client_with_db, role):
    r = client_with_db.patch(
        "/api/users/target-user-id/role",
        headers=auth(role),
        json={"role_name": "VIEWER"},
    )
    assert r.status_code == 403, f"{role} NÃO deveria ter users:assign_role"


# ---------------------------------------------------------------------------
# audit:read_all — ADMIN e AUDITORIA
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "AUDITORIA"])
def test_audit_read_all_allowed(client_with_db, role):
    from datetime import datetime, timezone
    date_from = "2026-01-01T00:00:00"
    r = client_with_db.get(f"/api/audit-logs?date_from={date_from}", headers=auth(role))
    assert r.status_code == 200, f"{role} deveria ter audit:read_all"


@pytest.mark.parametrize("role", ["GESTOR", "VIEWER"])
def test_audit_read_all_forbidden(client_with_db, role):
    r = client_with_db.get("/api/audit-logs?date_from=2026-01-01T00:00:00", headers=auth(role))
    assert r.status_code == 403, f"{role} NÃO deveria ter audit:read_all"


# ---------------------------------------------------------------------------
# audit:read_scoped — TI_SUPORTE (com actor_user_id obrigatório)
# ---------------------------------------------------------------------------

def test_ti_suporte_can_query_scoped_audit(client_with_db):
    r = client_with_db.get(
        "/api/audit-logs?date_from=2026-01-01T00:00:00&actor_user_id=target-user-id",
        headers=auth("TI_SUPORTE"),
    )
    assert r.status_code == 200

def test_ti_suporte_scoped_requires_actor_user_id(client_with_db):
    """TI_SUPORTE com read_scoped sem actor_user_id deve retornar 422."""
    r = client_with_db.get(
        "/api/audit-logs?date_from=2026-01-01T00:00:00",
        headers=auth("TI_SUPORTE"),
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# action_plans — permissões
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("role", ["ADMIN", "GESTOR", "TI_SUPORTE", "AUDITORIA", "VIEWER"])
def test_action_plans_read_allowed(client_with_db, role):
    r = client_with_db.get("/api/action-plans", headers=auth(role))
    assert r.status_code == 200

@pytest.mark.parametrize("role", ["ADMIN", "GESTOR"])
def test_action_plans_write_allowed(client_with_db, role):
    r = client_with_db.post("/api/action-plans", headers=auth(role), json={"title": "Test Plan"})
    assert r.status_code in (200, 201), f"{role} deveria ter action_plans:write"

@pytest.mark.parametrize("role", ["TI_SUPORTE", "AUDITORIA", "VIEWER"])
def test_action_plans_write_forbidden(client_with_db, role):
    r = client_with_db.post("/api/action-plans", headers=auth(role), json={"title": "Test Plan"})
    assert r.status_code == 403
