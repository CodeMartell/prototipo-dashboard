"""
tests/unit/test_ownership_check.py
Testes de ownership check para kpi:delete e action_plans:delete do GESTOR.

GESTOR pode excluir somente o que ele mesmo criou.
ADMIN pode excluir qualquer registro.
"""
import pytest
from unittest.mock import MagicMock, patch

from app.core.exceptions import ForbiddenError
from app.services.dashboard_service import DashboardService
from app.services.action_plan_service import ActionPlanService
from app.schemas.dashboard_schema import KpiRecordIn


# ---------------------------------------------------------------------------
# kpi:delete — DashboardService.delete_kpi_record ownership check
# ---------------------------------------------------------------------------

class TestKpiDeleteOwnership:
    """Testa ownership check no nível do service, sem banco."""

    def _make_service(self, submitted_by_user_id: str | None = None):
        """Cria DashboardService com repositório mockado."""
        repo = MagicMock()
        # Simula registro existente com submitted_by
        existing_record = MagicMock()
        existing_record.submitted_by = submitted_by_user_id
        existing_record.target = 0.04
        existing_record.result = 0.05
        existing_record.achievement = 0.8
        repo.list_kpi_records.return_value = [existing_record]
        repo.delete_kpi_record.return_value = True
        repo.db = MagicMock()
        repo.db.add = MagicMock()
        repo.commit = MagicMock()
        return DashboardService(repo)

    def test_gestor_can_delete_own_kpi(self):
        """GESTOR pode excluir registro que ele mesmo criou."""
        service = self._make_service(submitted_by_user_id="gestor-123")
        actor = {"id": "gestor-123", "role": "GESTOR", "email": "g@test.com"}
        # Não deve levantar exceção
        result = service.delete_kpi_record("logistic_cost", "Y26", "Jan", user=actor)
        assert result["status"] == "deleted"

    def test_gestor_cannot_delete_others_kpi(self):
        """GESTOR NÃO pode excluir registro criado por outro usuário → ForbiddenError."""
        service = self._make_service(submitted_by_user_id="outro-gestor-456")
        actor = {"id": "gestor-123", "role": "GESTOR", "email": "g@test.com"}
        with pytest.raises(ForbiddenError):
            service.delete_kpi_record("logistic_cost", "Y26", "Jan", user=actor)

    def test_gestor_cannot_delete_rpa_kpi(self):
        """GESTOR NÃO pode excluir registro sem submitted_by (veio do RPA)."""
        service = self._make_service(submitted_by_user_id=None)
        actor = {"id": "gestor-123", "role": "GESTOR", "email": "g@test.com"}
        with pytest.raises(ForbiddenError):
            service.delete_kpi_record("logistic_cost", "Y26", "Jan", user=actor)

    def test_admin_can_delete_any_kpi(self):
        """ADMIN ignora o ownership check — pode excluir qualquer registro."""
        service = self._make_service(submitted_by_user_id="outro-usuario-999")
        actor = {"id": "admin-001", "role": "ADMIN", "email": "admin@test.com"}
        # Não deve levantar exceção
        result = service.delete_kpi_record("logistic_cost", "Y26", "Jan", user=actor)
        assert result["status"] == "deleted"


# ---------------------------------------------------------------------------
# action_plans:delete — ActionPlanService.delete_plan ownership check
# ---------------------------------------------------------------------------

class TestActionPlanDeleteOwnership:
    """Testa ownership check no nível do service, sem banco."""

    def _make_service(self, plan_submitted_by: str | None = None):
        repo = MagicMock()
        plan = MagicMock()
        plan.id = "plan-001"
        plan.title = "Test Plan"
        plan.submitted_by = plan_submitted_by
        repo.get_by_id.return_value = plan
        repo.delete.return_value = True
        repo.db = MagicMock()
        return ActionPlanService(repo)

    def test_gestor_can_delete_own_plan(self):
        service = self._make_service(plan_submitted_by="gestor-123")
        actor = {"id": "gestor-123", "role": "GESTOR"}
        # Não deve levantar exceção
        service.delete_plan("plan-001", actor=actor)

    def test_gestor_cannot_delete_others_plan(self):
        service = self._make_service(plan_submitted_by="outro-gestor-456")
        actor = {"id": "gestor-123", "role": "GESTOR"}
        with pytest.raises(ForbiddenError):
            service.delete_plan("plan-001", actor=actor)

    def test_admin_can_delete_any_plan(self):
        service = self._make_service(plan_submitted_by="outro-usuario-999")
        actor = {"id": "admin-001", "role": "ADMIN"}
        # Não deve levantar exceção (nenhum ForbiddenError)
        service.delete_plan("plan-001", actor=actor)
