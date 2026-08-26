"""
app/models/role.py
Perfis de usuário (ex: ADMIN).
Separado de User para permitir permissões por perfil sem alterar a tabela de usuários.
"""
import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # ex: "ADMIN"

    users = relationship("User", back_populates="role")
