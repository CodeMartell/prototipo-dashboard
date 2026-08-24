"""
app/services/user_service.py
Cadastro e gestão de usuários — fecha "Definir perfis de usuário" e
"Implementar permissões por perfil" do Épico 1, do lado do backend.
"""
import uuid

from app.core.exceptions import DomainError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_schema import UserCreate

DEFAULT_ROLES = ("ADMIN", "GESTOR", "VISUALIZADOR")


class UserService:
    def __init__(self, user_repository: UserRepository, role_repository: RoleRepository):
        self.user_repository = user_repository
        self.role_repository = role_repository

    def create_user(self, payload: UserCreate) -> User:
        if self.user_repository.get_by_email(payload.email) is not None:
            raise DomainError("Já existe um usuário com esse email", status_code=409)

        role = self.role_repository.get_by_name(payload.role_name)
        if role is None:
            raise DomainError(
                f"Perfil inválido: {payload.role_name}. Válidos: {', '.join(DEFAULT_ROLES)}",
                status_code=422,
            )

        user = User(
            id=str(uuid.uuid4()),
            email=payload.email,
            name=payload.name,
            password_hash=hash_password(payload.password),
            role_id=role.id,
        )
        return self.user_repository.create(user)
