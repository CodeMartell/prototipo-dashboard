import os

import pytest


@pytest.mark.skipif(not os.getenv("RUN_EMAIL_INTEGRATION_TESTS"), reason="Exige ambiente IMAP/PostgreSQL de teste")
def test_real_environment_is_explicitly_enabled():
    """Protege o area owner: integracao real so roda quando explicitamente habilitada."""
    assert os.getenv("EMAIL_USER") and os.getenv("DATABASE_URL")
