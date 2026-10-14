"""
app/services/auth_service.py
Login com email/senha — inclui permissions no JWT para RBAC granular.
"""
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.core.logging import audit_logger
from app.repositories.user_repository import UserRepository
from app.repositories.permission_repository import PermissionRepository
from app.schemas.auth_schema import TokenResponse
from app.services.audit_log_service import AuditLogService


class AuthService:
    def __init__(self, user_repository: UserRepository, permission_repository: PermissionRepository | None = None):
        self.user_repository = user_repository
        self.permission_repository = permission_repository

    def login(self, email: str, password: str, client_ip: str = "unknown") -> TokenResponse:
        user = self.user_repository.get_by_email(email)
        role_name = getattr(getattr(user, "role", None), "name", None) if user else None

        if user is None or not verify_password(password, user.password_hash):
            audit_logger.warning(f"Falha de login para o e-mail: {email} (IP: {client_ip})")
            # Registra falha no audit_log
            try:
                AuditLogService(self.user_repository.db).log(
                    action="login.failed",
                    actor_user_id=user.id if user else None,
                    actor_role_snapshot=role_name if user else None,
                    target_type="user",
                    target_id=email,
                    metadata={"email": email},
                    ip_address=client_ip,
                )
            except Exception:
                pass
            raise UnauthorizedError("Email ou senha inválidos")

        audit_logger.info(f"Login bem-sucedido para o usuário: {email}")

        # Carrega permissões do role para embutir no JWT
        permissions: list[str] = []
        if self.permission_repository is not None:
            try:
                permissions = self.permission_repository.get_permission_codes_for_role(user.role.name)
            except Exception:
                permissions = []

        token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "role": user.role.name,
                "permissions": permissions,
            },
        )

        # Registra login bem-sucedido no audit_log
        try:
            AuditLogService(self.user_repository.db).log(
                action="login.success",
                actor_user_id=user.id,
                actor_role_snapshot=user.role.name,
                target_type="user",
                target_id=user.id,
                metadata={"email": user.email},
                ip_address=client_ip,
            )
        except Exception:
            pass  # Não falha o login por erro de auditoria

        return TokenResponse(access_token=token)

