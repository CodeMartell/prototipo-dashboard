"""
app/controllers/auth_controller.py
Login e verificação de sessão.

TODO(): adicionar rota de logout real quando a estratégia de
sessão for definida (blacklist de token, cookie httpOnly, etc.) e as
rotas de login corporativo (Microsoft/Google), se for o caminho escolhido.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(UserRepository(db))
    client_ip = request.client.host if request.client else "unknown"
    return service.login(payload.email, payload.password, client_ip)


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
