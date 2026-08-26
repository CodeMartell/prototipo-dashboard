"""
scripts/init_db.py
Cria as tabelas KPI no PostgreSQL.
Pode ser executado multiplas vezes com seguranca (CREATE TABLE IF NOT EXISTS).

Uso:
    python scripts/init_db.py
"""
from __future__ import annotations
import logging
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "rpa_email" / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
LOGGER = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    LOGGER.error("DATABASE_URL nao configurada. Defina no arquivo rpa_email/.env")
    raise SystemExit(1)

import sys
sys.path.insert(0, str(ROOT_DIR))
from rpa_email.app.kpi_repository import KpiPostgresRepository
from rpa_email.app.repository import PostgresProcessingRepository

def main() -> None:
    LOGGER.info("[DB] Conectando ao PostgreSQL: %s...", DATABASE_URL[:30])
    # Tabela de controle de e-mails (ja existente no projeto)
    email_repo = PostgresProcessingRepository(DATABASE_URL)
    email_repo.initialize()
    LOGGER.info("[DB] Tabela email_processing pronta.")
    # Tabelas KPI
    kpi_repo = KpiPostgresRepository(DATABASE_URL)
    kpi_repo.initialize()
    LOGGER.info("[DB] Inicializacao concluida.")

if __name__ == "__main__":
    main()
