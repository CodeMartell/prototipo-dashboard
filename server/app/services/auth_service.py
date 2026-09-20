"""
app/services/auth_service.py
Login com email/senha.
"""
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.core.logging import audit_logger
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import TokenResponse
from app.services.activity_log_service import ActivityLogService


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def login(self, email: str, password: str, client_ip: str = "unknown") -> TokenResponse:
        user = self.user_repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            audit_logger.warning(f"Falha de login para o e-mail: {email} (IP: {client_ip})")
            raise UnauthorizedError("Email ou senha inválidos")

        audit_logger.info(f"Login bem-sucedido para o usuário: {email}")
        token = create_access_token(subject=user.id, extra_claims={"email": user.email, "role": user.role.name})

        # Registra no log de atividades da plataforma
        try:
            ActivityLogService(self.user_repository.db).log(
                action_type="LOGIN",
                user_id=user.id,
                user_email=user.email,
                entity_type="user",
                entity_id=user.id,
                detail={"message": "Usuário autenticado com sucesso"},
                ip_address=client_ip,
            )
        except Exception:
            pass  # Não falha o login por erro de auditoria

        return TokenResponse(access_token=token)
