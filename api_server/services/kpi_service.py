from __future__ import annotations

import logging
from typing import Any, Tuple

from api_server.repositories.base import KpiRepositoryInterface

LOGGER = logging.getLogger(__name__)


class KpiService:
    """
    Serviço de Domínio para agregação de dados KPI.
    Gerencia estratégia de busca (PostgreSQL prioritário com fallback para Excel/mock).
    """

    def __init__(
        self,
        postgres_repo: KpiRepositoryInterface,
        excel_repo: KpiRepositoryInterface,
    ):
        self._postgres_repo = postgres_repo
        self._excel_repo = excel_repo

    def get_dashboard_data(self) -> Tuple[dict[str, list[dict[str, Any]]], str]:
        """
        Retorna todos os dados de KPI e a respectiva fonte utilizada ('postgresql', 'excel_cache' ou 'none').
        """
        # 1. Tentar PostgreSQL
        if self._postgres_repo.is_available():
            try:
                data = self._postgres_repo.fetch_all()
                total = sum(len(v) for v in data.values())
                if total > 0:
                    return data, "postgresql"
            except Exception as exc:
                LOGGER.warning("Falha ao consultar PostgreSQL (%s), acionando fallback...", exc)

        # 2. Tentar Excel local
        if self._excel_repo.is_available():
            try:
                data = self._excel_repo.fetch_all()
                total = sum(len(v) for v in data.values())
                if total > 0:
                    return data, "excel_cache"
            except Exception as exc:
                LOGGER.warning("Falha ao consultar Excel (%s)...", exc)

        return {}, "none"

    def get_health_status(self) -> dict[str, Any]:
        """Verifica o status operacional e conectividade."""
        _, source = self.get_dashboard_data()
        return {
            "status": "ok",
            "source": source,
            "postgres_connected": self._postgres_repo.is_available(),
            "excel_cache_available": self._excel_repo.is_available(),
        }
