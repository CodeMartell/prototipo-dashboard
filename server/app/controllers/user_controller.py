"""
app/controllers/user_controller.py
Cadastro de usuário — restrito a ADMIN, já que não há autocadastro público).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import UserOut
from app.schemas.user_schema import UserCreate
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(require_role("ADMIN")),
):
    service = UserService(UserRepository(db), RoleRepository(db))
    user = service.create_user(payload)
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role.name)
