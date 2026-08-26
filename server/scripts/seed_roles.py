"""
scripts/seed_roles.py
Cria o perfil ADMIN, se ainda não existir. Rodar uma vez, depois das
migrations: python scripts/seed_roles.py

Só ADMIN por enquanto — outros perfis (GESTOR, VISUALIZADOR) podem ser
adicionados aqui no futuro, se o time decidir diferenciar permissões.
"""
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.session import SessionLocal
from app.models.role import Role
from app.models.user import User  # noqa: F401 — necessário p/ resolver o relationship Role<->User

ROLES = ["ADMIN"]


def seed_roles() -> None:
    db = SessionLocal()
    try:
        existing = {r.name for r in db.query(Role).all()}
        created = []
        for name in ROLES:
            if name not in existing:
                db.add(Role(id=str(uuid.uuid4()), name=name))
                created.append(name)
        db.commit()
        if created:
            print(f"Perfis criados: {', '.join(created)}")
        else:
            print("Perfis já existiam — nada a fazer.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
