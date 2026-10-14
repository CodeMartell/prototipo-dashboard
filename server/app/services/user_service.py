"""
app/services/user_service.py
Cadastro e gestão de usuários — com enforcement de anti-escalação de privilégio.

REGRA CRÍTICA: update_user_role() valida no service layer que TI_SUPORTE
não pode atribuir o papel ADMIN — não apenas na dependency de rota.
"""
import uuid

from app.core.exceptions import DomainError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_schema import UserCreate

VALID_ROLES = ("ADMIN", "GESTOR", "TI_SUPORTE", "AUDITORIA", "VIEWER")


class UserService:
    def __init__(self, user_repository: UserRepository, role_repository: RoleRepository):
        self.user_repository = user_repository
        self.role_repository = role_repository

    def list_users(self) -> list[User]:
        return self.user_repository.list_all()

    def get_user(self, user_id: str) -> User:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"Usuário {user_id} não encontrado")
        return user

    def create_user(self, payload: UserCreate) -> User:
        if self.user_repository.get_by_email(payload.email) is not None:
            raise DomainError("Já existe um usuário com esse email", status_code=409)

        role = self.role_repository.get_by_name(payload.role_name)
        if role is None:
            raise DomainError(
                f"Perfil inválido: {payload.role_name}. Válidos: {', '.join(VALID_ROLES)}",
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

    def update_user(self, user_id: str, name: str | None = None) -> User:
        user = self.get_user(user_id)
        if name is not None:
            user.name = name
        return self.user_repository.update(user)

    def update_user_role(self, user_id: str, new_role_name: str, actor: dict) -> User:
        """
        Atualiza o papel de um usuário.

        ENFORCEMENT CRÍTICO (service layer):
        - TI_SUPORTE não pode atribuir o papel ADMIN, mesmo tendo users:assign_role.
        - Apenas ADMIN pode atribuir ADMIN.
        """
        actor_role = actor.get("role", "")

        # Anti-escalação: TI_SUPORTE tentando promover para ADMIN → 403
        if actor_role == "TI_SUPORTE" and new_role_name == "ADMIN":
            raise ForbiddenError(
                "TI_SUPORTE não pode atribuir o papel ADMIN. Apenas ADMIN pode fazer isso."
            )

        new_role = self.role_repository.get_by_name(new_role_name)
        if new_role is None:
            raise DomainError(
                f"Perfil inválido: {new_role_name}. Válidos: {', '.join(VALID_ROLES)}",
                status_code=422,
            )

        user = self.get_user(user_id)
        old_role_name = user.role.name if user.role else None
        user.role_id = new_role.id
        updated = self.user_repository.update(user)

        # Registra mudança de papel no audit_log
        try:
            from app.services.audit_log_service import AuditLogService
            AuditLogService(self.user_repository.db).log(
                action="user.role_changed",
                actor_user_id=actor.get("id"),
                actor_role_snapshot=actor_role,
                target_type="user",
                target_id=user_id,
                metadata={"old_role": old_role_name, "new_role": new_role_name},
            )
        except Exception:
            pass

        return updated

    def delete_user(self, user_id: str, actor: dict) -> None:
        user = self.get_user(user_id)
        # Registra no audit_log antes de excluir
        try:
            from app.services.audit_log_service import AuditLogService
            AuditLogService(self.user_repository.db).log(
                action="user.deleted",
                actor_user_id=actor.get("id"),
                actor_role_snapshot=actor.get("role"),
                target_type="user",
                target_id=user_id,
                metadata={"email": user.email},
            )
        except Exception:
            pass
        self.user_repository.delete(user_id)

