"""
app/repositories/permission_repository.py
Acesso à tabela permissions e role_permissions.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission, RolePermission
from app.models.role import Role


class PermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_permission_codes_for_role(self, role_name: str) -> list[str]:
        """Retorna lista de códigos de permissão para um role pelo nome."""
        stmt = (
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .where(Role.name == role_name)
        )
        return list(self.db.scalars(stmt))

    def get_all_permissions(self) -> list[Permission]:
        return list(self.db.scalars(select(Permission)))
