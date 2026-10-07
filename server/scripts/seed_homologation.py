"""Inicializa somente o banco descartável da homologação local."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy.engine import make_url
from app.core.config import get_settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.role import Role
from app.models.user import User

settings = get_settings()
url = make_url(settings.DATABASE_URL)
if settings.ENVIRONMENT != 'homologacao-local' or url.host != 'postgres-homologacao' or url.database != 'datalens_homologacao':
    raise SystemExit('Seed bloqueado fora da homologacao local')
email, password = os.environ.get('RPA_API_EMAIL'), os.environ.get('RPA_API_PASSWORD')
if not email or not password:
    raise SystemExit('Credenciais de homologacao ausentes')
with SessionLocal() as db:
    roles = {}
    for role_name in ('ADMIN', 'VISUALIZADOR'):
        role = db.query(Role).filter_by(name=role_name).first()
        if role is None:
            role = Role(name=role_name)
            db.add(role)
            db.flush()
        roles[role_name] = role
    if db.query(User).filter_by(email=email).first() is None:
        db.add(User(email=email, name='Bot Homologacao', password_hash=hash_password(password), role_id=roles['ADMIN'].id))
    db.commit()
print('Conta de homologacao pronta; credenciais nao exibidas.')
