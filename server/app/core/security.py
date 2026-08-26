"""
app/core/security.py
Funções puras de segurança: hash de senha e criação/validação de JWT.
Não conhece HTTP nem banco — só recebe/devolve dados.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()


def hash_password(raw_password: str) -> str:
    pwd_bytes = raw_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(raw_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(raw_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    """Gera um JWT contendo `sub` (id do usuário) + claims extras (ex: role)."""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
    payload = {"sub": subject, "exp": expires_at}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Levanta jwt.PyJWTError se o token for inválido ou expirado."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
