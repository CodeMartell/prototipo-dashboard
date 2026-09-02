"""
tests/test_kpi_meta.py
Cobre a direcao de cada indicador no calculo do achievement — a conta e
diferente para custo (menor e melhor) e para ganho (maior e melhor), e
errar isso inverte a leitura do dashboard.
"""
import pytest

from app.core.kpi_meta import (
    compute_achievement,
    compute_ratio,
    validate_month,
    validate_year,
)


def test_custo_usa_meta_sobre_resultado():
    # War Room: meta 4,2% com resultado 3,9% supera a meta.
    assert compute_achievement("logistic_cost", 0.042, 0.039) == pytest.approx(1.0769, abs=1e-4)
    # Resultado acima da meta fica abaixo de 100%.
    assert compute_achievement("air_freight", 0.0022, 0.0056) == pytest.approx(0.3929, abs=1e-4)


def test_ganho_usa_resultado_sobre_meta():
    # Task Cost Reduction: entregar mais que o previsto passa de 100%.
    assert compute_achievement("total_cost", 661, 700) == pytest.approx(1.059, abs=1e-3)
    # Resin Consolidation: saving liquido abaixo do bruto fica abaixo de 100%.
    assert compute_achievement("incidental_cost", 4.0, 2.8) == pytest.approx(0.7, abs=1e-6)


def test_meta_zero_atingida_conta_como_cem_por_cento():
    # Demurrage: meta zero conteiner com resultado zero.
    assert compute_achievement("demurrage", 0, 0) == 1.0


def test_meta_zero_nao_atingida_fica_em_zero():
    # Demurrage: 3 conteineres contra meta zero.
    assert compute_achievement("demurrage", 0, 3) == 0.0


def test_divisao_impossivel_devolve_none():
    # Ganho sem meta definida: nao da para medir atingimento.
    assert compute_achievement("incidental_cost", 0, 8.75) is None
    assert compute_achievement("logistic_cost", None, 0.04) is None


def test_ratio_e_custo_sobre_producao():
    assert compute_ratio(2.66, 49.9) == pytest.approx(0.053307, abs=1e-6)
    assert compute_ratio(2.5, 0) is None
    assert compute_ratio(None, 50) is None


def test_validacao_de_periodo():
    assert validate_month("Sep") == "Sep"
    assert validate_year("Y26") == "Y26"

    with pytest.raises(ValueError):
        validate_month("Set")
    with pytest.raises(ValueError):
        validate_year("2026")
