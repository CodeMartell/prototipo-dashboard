"""
scripts/create_admin.py
Cria o primeiro usuário ADMIN — necessário porque POST /api/users exige
ADMIN pra criar qualquer usuário (ninguém se autocadastra). Rodar uma
vez, depois de alembic upgrade head + seed_roles.py:

    python scripts/create_admin.py seu-email@exemplo.com suasenha123
"""
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.role import Role
from app.models.user import User


def create_admin(email: str, password: str, name: str = "Admin") -> None:
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"Já existe um usuário com o email {email}.")
            return

        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if admin_role is None:
            print("Perfil ADMIN não encontrado — rode scripts/seed_roles.py primeiro.")
            return

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            password_hash=hash_password(password),
            role_id=admin_role.id,
        )
        db.add(user)
        db.commit()
        print(f"Usuário ADMIN criado: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python scripts/create_admin.py <email> <senha> [nome]")
        raise SystemExit(1)

    email_arg = sys.argv[1]
    password_arg = sys.argv[2]
    name_arg = sys.argv[3] if len(sys.argv) > 3 else "Admin"
    create_admin(email_arg, password_arg, name_arg)
