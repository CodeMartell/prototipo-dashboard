"""
rpa_email/app/kpi_repository.py
Persiste e recupera dados KPI no PostgreSQL.
Schema separado da tabela de controle de e-mails (email_processing).
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any

import psycopg

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------

_DDL_STANDARD_KPI = """
CREATE TABLE IF NOT EXISTS {table} (
    id          BIGSERIAL PRIMARY KEY,
    month       VARCHAR(3)   NOT NULL,
    year        VARCHAR(4)   NOT NULL,
    target      NUMERIC(12,6) NOT NULL,
    result      NUMERIC(12,6) NOT NULL,
    achievement NUMERIC(10,4),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (month, year)
);
"""

_DDL_LOGISTICS_VS_PROD = """
CREATE TABLE IF NOT EXISTS kpi_logistics_vs_prod (
    id                BIGSERIAL PRIMARY KEY,
    month             VARCHAR(3)    NOT NULL,
    year              VARCHAR(4)    NOT NULL,
    logistics_cost    NUMERIC(12,4) NOT NULL,
    production_amount NUMERIC(12,4) NOT NULL,
    ratio             NUMERIC(10,6),
    imported_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (month, year)
);
"""

_STANDARD_TABLES = {
    "logistic_cost":   "kpi_logistic_cost",
    "air_freight":     "kpi_air_freight",
    "incidental_cost": "kpi_incidental_cost",
    "total_cost":      "kpi_total_cost",
    "demurrage":       "kpi_demurrage",
}


class KpiPostgresRepository:
    """Gerencia a persistencia dos KPIs no PostgreSQL."""

    def __init__(self, database_url: str):
        self._url = database_url

    @contextmanager
    def _conn(self):
        with psycopg.connect(self._url, connect_timeout=2) as conn:
            yield conn

    # ------------------------------------------------------------------
    # Inicializacao do schema
    # ------------------------------------------------------------------

    def initialize(self) -> None:
        LOGGER.info("[DB] Inicializando schema de KPIs no PostgreSQL...")
        with self._conn() as conn:
            for kpi_key, table in _STANDARD_TABLES.items():
                conn.execute(_DDL_STANDARD_KPI.format(table=table))
                LOGGER.info("[DB] Tabela '%s' pronta.", table)
            conn.execute(_DDL_LOGISTICS_VS_PROD)
            LOGGER.info("[DB] Tabela 'kpi_logistics_vs_prod' pronta.")
        LOGGER.info("[DB] Schema inicializado com sucesso.")

    # ------------------------------------------------------------------
    # Persistencia dos KPIs padrao (target/result/achievement)
    # ------------------------------------------------------------------

    def upsert_standard_kpi(self, kpi_key: str, rows: list[Any]) -> int:
        """
        Insere ou atualiza registros de um KPI padrao.
        Retorna quantidade de registros gravados.
        """
        table = _STANDARD_TABLES.get(kpi_key)
        if not table:
            raise ValueError(f"KPI desconhecido: {kpi_key}")

        if not rows:
            return 0

        sql = f"""
            INSERT INTO {table} (month, year, target, result, achievement)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (month, year) DO UPDATE SET
                target      = EXCLUDED.target,
                result      = EXCLUDED.result,
                achievement = EXCLUDED.achievement,
                imported_at = NOW()
        """

        count = 0
        with self._conn() as conn:
            for row in rows:
                conn.execute(sql, (
                    row.month, row.year,
                    row.target, row.result, row.achievement,
                ))
                count += 1

        LOGGER.info("[DB] %s: %d registros gravados em '%s'.", kpi_key, count, table)
        return count

    # ------------------------------------------------------------------
    # Persistencia do KPI Logistics vs Prod
    # ------------------------------------------------------------------

    def upsert_logistics_vs_prod(self, rows: list[Any]) -> int:
        if not rows:
            return 0

        sql = """
            INSERT INTO kpi_logistics_vs_prod
                (month, year, logistics_cost, production_amount, ratio)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (month, year) DO UPDATE SET
                logistics_cost    = EXCLUDED.logistics_cost,
                production_amount = EXCLUDED.production_amount,
                ratio             = EXCLUDED.ratio,
                imported_at       = NOW()
        """

        count = 0
        with self._conn() as conn:
            for row in rows:
                conn.execute(sql, (
                    row.month, row.year,
                    row.logistics_cost, row.production_amount, row.ratio,
                ))
                count += 1

        LOGGER.info("[DB] logistics_vs_prod: %d registros gravados.", count)
        return count

    # ------------------------------------------------------------------
    # Leitura dos KPIs
    # ------------------------------------------------------------------

    def fetch_all(self) -> dict:
        """
        Retorna todos os dados KPI estruturados para o dashboard.
        Formato compativel com mockData.js.
        """
        data: dict = {}

        with self._conn() as conn:
            # KPIs padrao
            for kpi_key, table in _STANDARD_TABLES.items():
                rows = conn.execute(
                    f"SELECT month, year, target, result, achievement FROM {table} ORDER BY year, month"
                ).fetchall()
                data[kpi_key] = [
                    {
                        "month": r[0], "year": r[1],
                        "target": float(r[2]), "result": float(r[3]),
                        "achievement": float(r[4]) if r[4] is not None else None,
                    }
                    for r in rows
                ]

            # Logistics vs Prod
            rows = conn.execute(
                "SELECT month, year, logistics_cost, production_amount, ratio "
                "FROM kpi_logistics_vs_prod ORDER BY year, month"
            ).fetchall()
            data["logistics_vs_prod"] = [
                {
                    "month": r[0], "year": r[1],
                    "logisticsCost": float(r[2]),
                    "productionAmount": float(r[3]),
                    "ratio": float(r[4]) if r[4] is not None else None,
                }
                for r in rows
            ]

        return data
