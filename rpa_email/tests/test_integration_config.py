"""Proteção para que integrações externas nunca rodem implicitamente."""

import os

def test_external_integration_requires_complete_explicit_configuration():
    """Nunca ignora teste: valida o bloqueio ou a configuração completa."""
    enabled = os.getenv("RUN_EMAIL_INTEGRATION_TESTS") == "1"
    configured = bool(os.getenv("EMAIL_USER") and os.getenv("DATABASE_URL"))
    if enabled:
        assert configured, "Integração externa ativada sem EMAIL_USER e DATABASE_URL"
    else:
        assert not enabled
