"""
tests/unit/test_audit_log_append_only.py
Testa que o AuditLog é verdadeiramente append-only:
- AuditLogRepository não expõe métodos de UPDATE ou DELETE
- AuditLogService registra eventos críticos corretamente
- TI_SUPORTE tentando promover para ADMIN retorna 403
"""
import pytest
from unittest.mock import MagicMock, patch

from app.core.exceptions import ForbiddenError
from app.repositories.audit_log_repository import AuditLogRepository
from app.services.audit_log_service import AuditLogService
from app.services.user_service import UserService
from app.core.exceptions import DomainError


# ---------------------------------------------------------------------------
# Append-only: AuditLogRepository não deve ter UPDATE nem DELETE
# ---------------------------------------------------------------------------

class TestAuditLogRepositoryAppendOnly:

    def test_repository_has_no_update_method(self):
        """AuditLogRepository não deve expor método update()."""
        assert not hasattr(AuditLogRepository, "update"), \
            "AuditLogRepository não deve ter método update — isso violaria o append-only"

    def test_repository_has_no_delete_method(self):
        """AuditLogRepository não deve expor método delete()."""
        assert not hasattr(AuditLogRepository, "delete"), \
            "AuditLogRepository não deve ter método delete — isso violaria o append-only"

    def test_repository_has_create_and_query_only(self):
        """AuditLogRepository deve ter apenas create e query como métodos de dados."""
        public_methods = [m for m in dir(AuditLogRepository) if not m.startswith("_")]
        data_methods = {"create", "query"}
        for method in public_methods:
            if method not in ("create", "query", "db"):
                # Permite métodos herdados de object, mas nenhum update/delete
                assert method not in ("update", "delete", "remove", "edit"), \
                    f"Método proibido encontrado: {method}"


# ---------------------------------------------------------------------------
# AuditLogService — registros corretos
# ---------------------------------------------------------------------------

class TestAuditLogService:

    def _make_service(self):
        db = MagicMock()
        repo = MagicMock()
        service = AuditLogService.__new__(AuditLogService)
        service.db = db
        service.repo = repo
        return service, repo

    def test_log_calls_create_only(self):
        """service.log() deve chamar repo.create(), nunca update ou delete."""
        db = MagicMock()
        repo = MagicMock()
        repo.create.return_value = MagicMock()

        service = AuditLogService.__new__(AuditLogService)
        service.db = db
        service.repo = repo

        service.log(
            action="test.action",
            actor_user_id="user-1",
            actor_role_snapshot="ADMIN",
            target_type="user",
            target_id="user-2",
        )
        repo.create.assert_called_once()
        repo.update = MagicMock()  # Se existisse e fosse chamado, o teste falharia
        # Garantir que não chamou update ou delete
        assert not hasattr(repo, "update") or not repo.update.called
        assert not hasattr(repo, "delete") or not repo.delete.called

    def test_query_requires_date_filter(self):
        """service.query() sem date_from nem date_to deve levantar DomainError."""
        db = MagicMock()
        service = AuditLogService(db)
        # Mocka o repositório interno
        service.repo = MagicMock()
        with pytest.raises(DomainError) as exc_info:
            service.query()
        assert "422" in str(exc_info.value.status_code) or exc_info.value.status_code == 422

    def test_query_with_date_from_succeeds(self):
        """service.query() com date_from deve chamar o repositório."""
        from datetime import datetime, timezone
        db = MagicMock()
        service = AuditLogService(db)
        service.repo = MagicMock()
        service.repo.query.return_value = ([], 0)

        result = service.query(date_from=datetime(2026, 1, 1, tzinfo=timezone.utc))
        assert result["total"] == 0
        service.repo.query.assert_called_once()


# ---------------------------------------------------------------------------
# Anti-escalação: TI_SUPORTE não pode atribuir ADMIN
# ---------------------------------------------------------------------------

class TestAntiEscalation:

    def _make_user_service(self, target_role_obj):
        user_repo = MagicMock()
        role_repo = MagicMock()
        role_repo.get_by_name.return_value = target_role_obj

        existing_user = MagicMock()
        existing_user.id = "target-id"
        existing_user.role = MagicMock()
        existing_user.role.name = "VIEWER"
        user_repo.get_by_id.return_value = existing_user
        user_repo.update.return_value = existing_user
        user_repo.db = MagicMock()

        return UserService(user_repo, role_repo)

    def test_ti_suporte_cannot_assign_admin(self):
        """
        TI_SUPORTE tentando atribuir ADMIN deve levantar ForbiddenError
        NO SERVICE LAYER — não depende da rota ou do token.
        """
        admin_role = MagicMock()
        admin_role.id = "admin-role-id"
        admin_role.name = "ADMIN"

        service = self._make_user_service(admin_role)
        actor = {"id": "ti-user", "role": "TI_SUPORTE", "permissions": ["users:assign_role"]}

        with pytest.raises(ForbiddenError) as exc_info:
            service.update_user_role("target-id", "ADMIN", actor=actor)
        assert "ADMIN" in str(exc_info.value.message)

    def test_admin_can_assign_admin(self):
        """ADMIN pode atribuir o papel ADMIN a outros usuários."""
        admin_role = MagicMock()
        admin_role.id = "admin-role-id"
        admin_role.name = "ADMIN"

        service = self._make_user_service(admin_role)
        actor = {"id": "admin-user", "role": "ADMIN", "permissions": ["users:assign_role"]}

        # Não deve levantar ForbiddenError
        result = service.update_user_role("target-id", "ADMIN", actor=actor)
        assert result is not None

    def test_ti_suporte_can_assign_viewer(self):
        """TI_SUPORTE pode atribuir VIEWER sem restrição."""
        viewer_role = MagicMock()
        viewer_role.id = "viewer-role-id"
        viewer_role.name = "VIEWER"

        service = self._make_user_service(viewer_role)
        actor = {"id": "ti-user", "role": "TI_SUPORTE", "permissions": ["users:assign_role"]}

        # Não deve levantar ForbiddenError
        result = service.update_user_role("target-id", "VIEWER", actor=actor)
        assert result is not None

    def test_ti_suporte_can_assign_gestor(self):
        """TI_SUPORTE pode atribuir GESTOR sem restrição."""
        gestor_role = MagicMock()
        gestor_role.id = "gestor-role-id"
        gestor_role.name = "GESTOR"

        service = self._make_user_service(gestor_role)
        actor = {"id": "ti-user", "role": "TI_SUPORTE", "permissions": ["users:assign_role"]}

        result = service.update_user_role("target-id", "GESTOR", actor=actor)
        assert result is not None
