from __future__ import annotations

import logging
from flask import Blueprint, jsonify, current_app

LOGGER = logging.getLogger(__name__)

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


@dashboard_bp.get("/dashboard")
def get_dashboard():
    """Retorna todos os dados KPI consolidados para o frontend."""
    try:
        service = current_app.config["KPI_SERVICE"]
        data, source = service.get_dashboard_data()
        total = sum(len(v) for v in data.values())
        LOGGER.info("GET /api/dashboard — %d registros retornados (fonte: %s)", total, source)
        return jsonify(data), 200
    except Exception as exc:
        LOGGER.exception("Erro interno ao buscar KPIs: %s", exc)
        return jsonify({"error": "Erro interno ao obter dados", "details": str(exc)}), 500


@dashboard_bp.get("/health")
def get_health():
    """Healthcheck do servidor e integridade das fontes de dados."""
    try:
        service = current_app.config["KPI_SERVICE"]
        status = service.get_health_status()
        LOGGER.info("GET /api/health — ok (fonte: %s)", status.get("source"))
        return jsonify(status), 200
    except Exception as exc:
        LOGGER.exception("Erro no healthcheck: %s", exc)
        return jsonify({"status": "error", "error": str(exc)}), 500
