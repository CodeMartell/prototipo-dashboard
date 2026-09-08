"""
app/models/kpi_change_log.py
Rastreabilidade de edições manuais e atualizações de KPI (valor anterior -> novo valor).
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class KpiChangeLog(Base):
    __tablename__ = "kpi_change_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    user_email: Mapped[str | None] = mapped_column(String, nullable=True)
    kpi_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    month: Mapped[str] = mapped_column(String(3), nullable=False)
    year: Mapped[str] = mapped_column(String(4), nullable=False)
    field_name: Mapped[str] = mapped_column(String(30), nullable=False)  # target, result, achievement, logistics_cost, production_amount, ratio
    old_value: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    new_value: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="manual")  # manual | email_ingestion
    snapshot_before: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
