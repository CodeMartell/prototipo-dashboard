"""
app/models/action_plan.py
Planos de ação — criados por ADMIN ou GESTOR, excluíveis com ownership check.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open")
    # open | in_progress | closed
    kpi_type: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    # KPI ao qual o plano está vinculado (opcional)
    submitted_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # null = sistema/importação; preenchido para entradas manuais
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator = relationship("User", foreign_keys=[submitted_by])
