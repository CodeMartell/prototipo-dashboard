"""
app/core/logging.py
Configuração central de logging — reaproveita o padrão do server.py atual.
"""
import logging


def setup_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    return logging.getLogger("dashboard_api")


logger = setup_logging()
