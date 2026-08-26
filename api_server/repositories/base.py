from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class KpiRepositoryInterface(ABC):
    """
    Interface abstrata para persistência de dados de KPI (Princípio da Inversão de Dependência - DIP).
    Permite alternar transparentemente entre PostgreSQL, cache Excel, mocks em memória, etc.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Verifica se a fonte de dados está acessível."""
        ...

    @abstractmethod
    def fetch_all(self) -> dict[str, list[dict[str, Any]]]:
        """Recupera todos os dados de KPIs formatados para o dashboard."""
        ...
