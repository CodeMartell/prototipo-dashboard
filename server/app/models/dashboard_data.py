"""
app/models/dashboard_data.py
Tabelas dos indicadores — mesmo formato que o server.py atual já espera
(STANDARD_TABLES): month, year, target, result, achievement.
"""
import uuid

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class KpiRecord(Base):
    """
    Uma linha por (kpi_type, month, year). kpi_type distingue as 5 tabelas
    que existiam separadas no protótipo (logistic_cost, air_freight,
    incidental_cost, total_cost, demurrage) — unificadas aqui numa tabela
    só, filtrável por tipo. Simplifica migrations e queries.
    """

    __tablename__ = "kpi_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    kpi_type: Mapped[str] = mapped_column(String, index=True, nullable=False)
    month: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[str] = mapped_column(String, nullable=False)
    target: Mapped[float] = mapped_column(Float, default=0.0)
    result: Mapped[float] = mapped_column(Float, default=0.0)
    achievement: Mapped[float | None] = mapped_column(Float, nullable=True)


class LogisticsVsProdRecord(Base):
    __tablename__ = "logistics_vs_prod_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    month: Mapped[str] = mapped_column(String, nullable=False)
    year: Mapped[str] = mapped_column(String, nullable=False)
    logistics_cost: Mapped[float] = mapped_column(Float, default=0.0)
    production_amount: Mapped[float] = mapped_column(Float, default=0.0)
    ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
