"""
app/services/auth_service.py
Login com email/senha. Substituir/complementar quando o Épico 1
definir se o login vai ser corporativo (Microsoft/Google via OAuth2).
"""
from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import TokenResponse


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.user_repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Email ou senha inválidos")

        token = create_access_token(subject=user.id, extra_claims={"email": user.email, "role": user.role.name})
        return TokenResponse(access_token=token)
