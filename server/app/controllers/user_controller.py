"""
app/controllers/user_controller.py
Gestão de usuários — CRUD para ADMIN e TI_SUPORTE.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_permission
from app.core.exceptions import NotFoundError
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import UserOut
from app.schemas.user_schema import UserCreate, UserUpdate, UserRoleUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


def _get_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db), RoleRepository(db))


@router.get("", response_model=list[UserOut])
def list_users(
    service: UserService = Depends(_get_service),
    _current_user: dict = Depends(require_permission("users:read")),
):
    users = service.list_users()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role.name if u.role else "",
            created_at=u.created_at,
        )
        for u in users
    ]


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    service: UserService = Depends(_get_service),
    _current_user: dict = Depends(require_permission("users:read")),
):
    user = service.get_user(user_id)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.name if user.role else "",
        created_at=user.created_at,
    )


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    service: UserService = Depends(_get_service),
    _current_user: dict = Depends(require_permission("users:write")),
):
    user = service.create_user(payload)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.name if user.role else "",
        created_at=user.created_at,
    )


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    service: UserService = Depends(_get_service),
    _current_user: dict = Depends(require_permission("users:write")),
):
    user = service.update_user(user_id, name=payload.name)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.name if user.role else "",
        created_at=user.created_at,
    )


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    service: UserService = Depends(_get_service),
    current_user: dict = Depends(require_permission("users:assign_role")),
):
    """
    Atribui um novo papel ao usuário.
    Anti-escalação: TI_SUPORTE não pode atribuir ADMIN (validado no service).
    """
    user = service.update_user_role(user_id, payload.role_name, actor=current_user)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.name if user.role else "",
        created_at=user.created_at,
    )


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    service: UserService = Depends(_get_service),
    current_user: dict = Depends(require_permission("users:write")),
):
    service.delete_user(user_id, actor=current_user)

