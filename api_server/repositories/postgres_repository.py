from __future__ import annotations

import logging
from typing import Any
import psycopg

from .base import KpiRepositoryInterface

LOGGER = logging.getLogger(__name__)

STANDARD_TABLES = {
    "logistic_cost": "kpi_logistic_cost",
    "air_freight": "kpi_air_freight",
    "incidental_cost": "kpi_incidental_cost",
    "total_cost": "kpi_total_cost",
    "demurrage": "kpi_demurrage",
}


class PostgresKpiRepository(KpiRepositoryInterface):
    """Implementação PostgreSQL do repositório de KPIs."""

    def __init__(self, database_url: str):
        self._database_url = database_url

    def is_available(self) -> bool:
        if not self._database_url:
            return False
        try:
            with psycopg.connect(self._database_url, connect_timeout=2) as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as exc:
            LOGGER.debug("PostgreSQL healthcheck falhou: %s", exc)
            return False

    def fetch_all(self) -> dict[str, list[dict[str, Any]]]:
        if not self._database_url:
            return {}

        data: dict[str, list[dict[str, Any]]] = {}
        with psycopg.connect(self._database_url, connect_timeout=2) as conn:
            for kpi_key, table in STANDARD_TABLES.items():
                try:
                    rows = conn.execute(
                        f"SELECT month, year, target, result, achievement "
                        f"FROM {table} ORDER BY year, month"
                    ).fetchall()
                    data[kpi_key] = [
                        {
                            "month": r[0],
                            "year": r[1],
                            "target": float(r[2]),
                            "result": float(r[3]),
                            "achievement": float(r[4]) if r[4] is not None else None,
                        }
                        for r in rows
                    ]
                except Exception as exc:
                    LOGGER.warning("Tabela %s não encontrada ou vazia no PostgreSQL: %s", table, exc)
                    data[kpi_key] = []

            try:
                rows = conn.execute(
                    "SELECT month, year, logistics_cost, production_amount, ratio "
                    "FROM kpi_logistics_vs_prod ORDER BY year, month"
                ).fetchall()
                data["logistics_vs_prod"] = [
                    {
                        "month": r[0],
                        "year": r[1],
                        "logisticsCost": float(r[2]),
                        "productionAmount": float(r[3]),
                        "ratio": float(r[4]) if r[4] is not None else None,
                    }
                    for r in rows
                ]
            except Exception as exc:
                LOGGER.warning("Tabela kpi_logistics_vs_prod não encontrada ou vazia: %s", exc)
                data["logistics_vs_prod"] = []

        return data
