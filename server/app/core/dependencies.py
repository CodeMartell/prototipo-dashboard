"""
app/core/dependencies.py
Dependências injetadas via Depends() nas rotas — evita repetir
"pega o token, valida, injeta o usuário" em cada controller.
"""
from collections.abc import Generator

import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.database.session import get_db_session

# Reexporta com o nome que os controllers vão importar
get_db = get_db_session


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """
    Extrai e valida o JWT do header Authorization: Bearer <token>.

    Retorna dict com: id, email, role, permissions (list[str]).

    TODO(Épico 1): se o time optar por login corporativo (Microsoft/Google),
    trocar a validação de JWT próprio por verificação do token OAuth2 do
    provedor — o contrato de retorno (dict com id/email/role/permissions) permanece igual.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError()

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise UnauthorizedError("Token inválido ou expirado")

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "permissions": payload.get("permissions", []),
    }


def require_permission(*required_permissions: str):
    """
    Factory de dependência baseada em permissões granulares.
    Uso em rota: Depends(require_permission("kpi:write_manual"))

    O usuário precisa ter QUALQUER UMA das permissões listadas (OR lógico).
    Para AND lógico, encadeie múltiplos Depends.
    """

    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        user_perms: list[str] = current_user.get("permissions", [])
        if required_permissions and not any(p in user_perms for p in required_permissions):
            raise ForbiddenError()
        return current_user

    return _check


def require_role(*allowed_roles: str):
    """
    Factory de dependência legada baseada em role name.
    Mantida para retrocompatibilidade — novos endpoints devem usar require_permission.
    """

    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if allowed_roles and current_user.get("role") not in allowed_roles:
            raise ForbiddenError()
        return current_user

    return _check

