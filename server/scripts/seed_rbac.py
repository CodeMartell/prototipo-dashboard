"""
scripts/seed_rbac.py
Seed idempotente — popula roles, permissions e role_permissions conforme
a matriz de permissões oficial do DataLens.

Uso:
    cd server
    python scripts/seed_rbac.py
"""
import sys
from pathlib import Path

# Garante que o pacote app/ é encontrado independente de onde o script é chamado
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session

from app.database.session import engine
from app.core.security import hash_password
from app.models.role import Role

from app.models.permission import Permission, RolePermission
from app.models.user import User

# ---------------------------------------------------------------------------
# Usuários padrão de teste para cada papel (Homologação / QA)
# ---------------------------------------------------------------------------

DEFAULT_USERS: list[tuple[str, str, str, str]] = [
    ("admin@lge.com",     "admin123",     "Administrador Geral",   "ADMIN"),
    ("gestor@lge.com",    "gestor123",    "Gestor de Indicadores", "GESTOR"),
    ("suporte@lge.com",   "suporte123",   "Suporte TI",            "TI_SUPORTE"),
    ("auditoria@lge.com", "auditoria123", "Auditor de Processos",  "AUDITORIA"),
    ("viewer@lge.com",    "viewer123",    "Visualizador Básico",   "VIEWER"),
]


# ---------------------------------------------------------------------------
# Fonte da verdade: matriz de permissões
# ---------------------------------------------------------------------------

PERMISSIONS: list[tuple[str, str]] = [
    ("dashboard:read",         "Leitura do dashboard de KPIs"),
    ("kpi:write_manual",       "Inserção/edição manual de indicadores"),
    ("kpi:delete",             "Exclusão de registros de KPI"),
    ("action_plans:read",      "Leitura de planos de ação"),
    ("action_plans:write",     "Criação e edição de planos de ação"),
    ("action_plans:delete",    "Exclusão de planos de ação"),
    ("users:read",             "Consulta de usuários"),
    ("users:write",            "Criação e edição de usuários"),
    ("users:assign_role",      "Atribuição de papéis a usuários"),
    ("audit:read_all",         "Leitura irrestrita do audit log (qualquer usuário)"),
    ("audit:read_scoped",      "Leitura do audit log de um usuário específico"),
]

ROLES: list[tuple[str, str, list[str]]] = [
    (
        "ADMIN",
        "Acesso total — único que pode atribuir o papel ADMIN a outros usuários",
        [
            "dashboard:read",
            "kpi:write_manual",
            "kpi:delete",
            "action_plans:read",
            "action_plans:write",
            "action_plans:delete",
            "users:read",
            "users:write",
            "users:assign_role",
            "audit:read_all",
            "audit:read_scoped",
        ],
    ),
    (
        "GESTOR",
        "Edita/insere indicadores manualmente e planos de ação",
        [
            "dashboard:read",
            "kpi:write_manual",
            "kpi:delete",          # ownership check aplicado no service layer
            "action_plans:read",
            "action_plans:write",
            "action_plans:delete", # ownership check aplicado no service layer
        ],
    ),
    (
        "TI_SUPORTE",
        "CRUD de usuários e atribuição de papéis (exceto ADMIN); consulta atividade de usuários",
        [
            "dashboard:read",
            "users:read",
            "users:write",
            "users:assign_role",   # anti-escalação: não pode atribuir ADMIN (service layer)
            "audit:read_scoped",
            "action_plans:read",
        ],
    ),
    (
        "AUDITORIA",
        "Leitura irrestrita do audit log de todos os usuários",
        [
            "dashboard:read",
            "action_plans:read",
            "audit:read_all",
        ],
    ),
    (
        "VIEWER",
        "Leitura de dashboard (acesso básico)",
        [
            "dashboard:read",
            "action_plans:read",
        ],
    ),
]


def seed(db: Session) -> None:
    print(">> Seed RBAC iniciado...")

    # 1. Upsert permissions
    perm_map: dict[str, Permission] = {}
    for code, description in PERMISSIONS:
        perm = db.query(Permission).filter_by(code=code).first()
        if perm is None:
            perm = Permission(code=code, description=description)
            db.add(perm)
            print(f"  [+] Permission: {code}")
        else:
            perm.description = description
            print(f"  [=] Permission ja existe: {code}")
        perm_map[code] = perm
    db.flush()

    # 2. Upsert roles e role_permissions
    for role_name, description, perm_codes in ROLES:
        role = db.query(Role).filter_by(name=role_name).first()
        if role is None:
            role = Role(name=role_name, description=description)
            db.add(role)
            print(f"  [+] Role: {role_name}")
        else:
            role.description = description
            print(f"  [=] Role ja existe: {role_name}")
        db.flush()

        # Remove associacoes antigas (idempotente)
        db.query(RolePermission).filter_by(role_id=role.id).delete()
        db.flush()

        for code in perm_codes:
            perm = perm_map[code]
            db.add(RolePermission(role_id=role.id, permission_id=perm.id))
        print(f"     -- {len(perm_codes)} permissoes atribuidas")
    db.flush()

    # 3. Upsert usuarios de demonstracao / testes para os 5 papeis
    print("\n>> Criando usuarios padrao para testes dos 5 papeis...")
    for email, password, name, role_name in DEFAULT_USERS:
        user = db.query(User).filter_by(email=email).first()
        role = db.query(Role).filter_by(name=role_name).first()
        if user is None:
            db.add(User(
                email=email,
                name=name,
                password_hash=hash_password(password),
                role_id=role.id,
            ))
            print(f"  [+] Usuario criado: {email} (Papel: {role_name})")
        else:
            user.role_id = role.id
            user.name = name
            print(f"  [=] Usuario ja existe: {email} (Papel: {role_name})")

    db.commit()
    print("\n[OK] Seed RBAC e usuarios de teste concluidos com sucesso.")




if __name__ == "__main__":
    with Session(engine) as db:
        seed(db)
