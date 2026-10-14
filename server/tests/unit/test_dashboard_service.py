"""
tests/test_dashboard_service.py
Regras do service de dashboard: validacao de entrada, derivacao de
achievement/ratio e o payload agregado que o frontend consome.
Usa um repositorio falso — nao precisa de Postgres.
"""
import pytest

from app.core.exceptions import DomainError
from app.schemas.dashboard_schema import KpiRecordIn, LogisticsVsProdIn
from app.services.dashboard_service import DashboardService


class FakeRepository:
    """Repositorio em memoria com a mesma interface usada pelo service."""

    def __init__(self, kpi_rows=None, lvp_rows=None):
        self.kpi_rows = kpi_rows or {}
        self.lvp_rows = lvp_rows or []
        self.upserts = []
        self.deleted = []
        self.commits = 0

    def list_kpi_records(self, kpi_type, year=None, month=None):
        return self.kpi_rows.get(kpi_type, [])

    def list_logistics_vs_prod(self):
        return self.lvp_rows

    def upsert_kpi_record(self, **kwargs):
        self.upserts.append(kwargs)

    def upsert_logistics_vs_prod(self, **kwargs):
        self.upserts.append(kwargs)

    def delete_kpi_record(self, kpi_type, month, year):
        self.deleted.append((kpi_type, month, year))
        return 1 if (kpi_type, month, year) != ("demurrage", "Dec", "Y99") else 0

    def commit(self):
        self.commits += 1


def _service(**kwargs):
    return DashboardService(FakeRepository(**kwargs))


def test_kpi_type_invalido_e_rejeitado():
    service = _service()
    with pytest.raises(DomainError) as exc:
        service.get_kpi("frete_maritimo", year=None, month=None)
    assert exc.value.status_code == 422


def test_mes_invalido_na_escrita_e_rejeitado():
    service = _service()
    with pytest.raises(DomainError) as exc:
        service.save_kpi_record(
            "logistic_cost", year="Y26", month="Set", payload=KpiRecordIn(target=1, result=1)
        )
    assert exc.value.status_code == 422


def test_ano_invalido_na_escrita_e_rejeitado():
    service = _service()
    with pytest.raises(DomainError) as exc:
        service.save_kpi_record(
            "logistic_cost", year="2026", month="Sep", payload=KpiRecordIn(target=1, result=1)
        )
    assert exc.value.status_code == 422


def test_achievement_derivado_quando_nao_enviado():
    service = _service()
    saved = service.save_kpi_record(
        "logistic_cost", year="Y26", month="Sep", payload=KpiRecordIn(target=0.042, result=0.039)
    )
    assert saved.achievement == pytest.approx(1.0769, abs=1e-4)
    assert service.repository.commits == 1


def test_achievement_enviado_e_preservado():
    service = _service()
    saved = service.save_kpi_record(
        "logistic_cost",
        year="Y26",
        month="Sep",
        payload=KpiRecordIn(target=0.042, result=0.039, achievement=0.5),
    )
    assert saved.achievement == 0.5


def test_ratio_derivado_quando_nao_enviado():
    service = _service()
    saved = service.save_logistics_vs_prod(
        year="Y26", month="Sep", payload=LogisticsVsProdIn(logistics_cost=2.5, production_amount=50)
    )
    assert saved.ratio == pytest.approx(0.05)


def test_remocao_de_periodo_inexistente_devolve_404():
    service = _service()
    with pytest.raises(DomainError) as exc:
        service.delete_kpi_record("demurrage", year="Y99", month="Dec")
    assert exc.value.status_code == 404


def test_payload_agregado_traz_os_seis_indicadores():
    service = _service()
    payload = service.get_dashboard()
    assert set(payload) == {
        "logistic_cost",
        "air_freight",
        "incidental_cost",
        "total_cost",
        "demurrage",
        "logistics_vs_prod",
    }
