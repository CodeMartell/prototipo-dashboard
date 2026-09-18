"""
app/models/permission.py
Tabelas de permissões e associação role→permission (RBAC granular).
"""
import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    # ex: "dashboard:read", "kpi:write_manual", "users:assign_role"
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)

    roles = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    """Tabela de junção M:N entre roles e permissions."""
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    role_id: Mapped[str] = mapped_column(ForeignKey("roles.id"), nullable=False, index=True)
    permission_id: Mapped[str] = mapped_column(ForeignKey("permissions.id"), nullable=False, index=True)

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="roles")
