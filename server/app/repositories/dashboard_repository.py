"""
app/repositories/dashboard_repository.py
Única camada que sabe fazer SQL sobre os dados de KPI. Leitura (usada
pelo dashboard/analysis) e escrita via upsert (usada pela ingestão).
"""
from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.kpi_meta import VALID_MONTHS
from app.models.kpi import KPI_MODEL_MAP, LogisticsVsProd


def _month_order(column):
    """
    Ordena por mês do calendário. Sem isso o Postgres ordena a string
    ("Apr" antes de "Jan") e o frontend recebe a série fora de ordem —
    o que quebra sparkline e cálculo de variação mês a mês.
    """
    return case({month: index for index, month in enumerate(VALID_MONTHS)}, value=column)


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_kpi_records(self, kpi_type: str, year: str | None = None, month: str | None = None) -> list:
        model = KPI_MODEL_MAP[kpi_type]  # o service já validou que kpi_type existe
        stmt = select(model)
        if year:
            stmt = stmt.where(model.year == year)
        if month:
            stmt = stmt.where(model.month == month)
        stmt = stmt.order_by(model.year, _month_order(model.month))
        return list(self.db.scalars(stmt))

    def list_logistics_vs_prod(self) -> list[LogisticsVsProd]:
        stmt = select(LogisticsVsProd).order_by(
            LogisticsVsProd.year, _month_order(LogisticsVsProd.month)
        )
        return list(self.db.scalars(stmt))

    def upsert_kpi_record(
        self, kpi_type: str, month: str, year: str, target: float, result: float, achievement: float | None
    ) -> None:
        """
        Grava um registro de KPI vindo da ingestão. Se já existir uma
        linha pra esse (kpi_type, month, year), atualiza em vez de
        duplicar — permite reenviar um período corrigido sem gerar lixo.
        """
        model = KPI_MODEL_MAP[kpi_type]
        stmt = pg_insert(model).values(
            month=month, year=year, target=target, result=result, achievement=achievement
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["month", "year"],
            set_={"target": target, "result": result, "achievement": achievement},
        )
        self.db.execute(stmt)

    def delete_all_kpi_records(self, kpi_type: str) -> int:
        """Limpa uma fotografia anterior antes de gravar a nova fonte oficial."""

        model = KPI_MODEL_MAP[kpi_type]
        result = self.db.execute(delete(model))
        return result.rowcount or 0

    def delete_kpi_record(self, kpi_type: str, month: str, year: str) -> int:
        """Remove o registro do período. Devolve quantas linhas foram apagadas."""
        model = KPI_MODEL_MAP[kpi_type]
        result = self.db.execute(
            delete(model).where(model.month == month, model.year == year)
        )
        return result.rowcount or 0

    def upsert_logistics_vs_prod(
        self, month: str, year: str, logistics_cost: float, production_amount: float, ratio: float | None
    ) -> None:
        stmt = pg_insert(LogisticsVsProd).values(
            month=month,
            year=year,
            logistics_cost=logistics_cost,
            production_amount=production_amount,
            ratio=ratio,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["month", "year"],
            set_={
                "logistics_cost": logistics_cost,
                "production_amount": production_amount,
                "ratio": ratio,
            },
        )
        self.db.execute(stmt)

    def commit(self) -> None:
        self.db.commit()
