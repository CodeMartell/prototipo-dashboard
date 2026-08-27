"""
app/core/logging.py
Configuração central de logging — reaproveita o padrão do server.py atual.
"""
import logging
from pathlib import Path


def setup_logging() -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    return logging.getLogger("dashboard_api")


logger = setup_logging()

# Configura logger de auditoria
audit_logger = logging.getLogger("audit")
# Usa diretório local do app para o log de auditoria
audit_log_path = Path(__file__).parent.parent.parent / "audit.log"
audit_handler = logging.FileHandler(audit_log_path)
audit_handler.setFormatter(logging.Formatter("%(asctime)s | AUDIT | %(message)s"))
audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)
