"""
app/models/kpi.py
Tabelas de KPI. Este backend É o dono do schema (criado via Alembic) —
quem grava aqui é o bot de extração, mas via chamada HTTP
pra este backend (POST /api/ingestion/kpi-report), não escrevendo
direto no Postgres.

5 tabelas padrão (mesma estrutura: month, year, target, result,
achievement) + 1 tabela extra (logistics_vs_prod). UNIQUE(month, year)
em cada uma pra permitir upsert (reenviar o mesmo período atualiza,
não duplica).
"""
from sqlalchemy import Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class _StandardKpiMixin:
    """Colunas comuns às 5 tabelas padrão — evita repetir em cada classe."""

    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[str] = mapped_column(String(3), nullable=False)
    year: Mapped[str] = mapped_column(String(4), nullable=False)
    target: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    result: Mapped[float] = mapped_column(Numeric(12, 6), nullable=False)
    achievement: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)


class LogisticCost(_StandardKpiMixin, Base):
    __tablename__ = "kpi_logistic_cost"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_logistic_cost_month_year"),)


class AirFreight(_StandardKpiMixin, Base):
    __tablename__ = "kpi_air_freight"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_air_freight_month_year"),)


class IncidentalCost(_StandardKpiMixin, Base):
    __tablename__ = "kpi_incidental_cost"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_incidental_cost_month_year"),)


class TotalCost(_StandardKpiMixin, Base):
    __tablename__ = "kpi_total_cost"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_total_cost_month_year"),)


class Demurrage(_StandardKpiMixin, Base):
    __tablename__ = "kpi_demurrage"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_demurrage_month_year"),)


class LogisticsVsProd(Base):
    __tablename__ = "kpi_logistics_vs_prod"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_logistics_vs_prod_month_year"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    month: Mapped[str] = mapped_column(String(3), nullable=False)
    year: Mapped[str] = mapped_column(String(4), nullable=False)
    logistics_cost: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    production_amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    ratio: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)


# Mapa kpi_type (usado na URL/payload da API) -> classe do model.
KPI_MODEL_MAP: dict[str, type] = {
    "logistic_cost": LogisticCost,
    "air_freight": AirFreight,
    "incidental_cost": IncidentalCost,
    "total_cost": TotalCost,
    "demurrage": Demurrage,
}
