from src.validator import converter_numero, padronizar_periodo, validar_qualidade_dados


def test_converter_numero_percentual():
    assert converter_numero("0,40%") == 0.0040
    assert converter_numero("3,15%") == 0.0315
    assert converter_numero("-0,12%") == -0.0012
    assert converter_numero("50%") == 0.50


def test_converter_numero_moeda_e_formatos():
    assert converter_numero("$ 125.40") == 125.40
    assert converter_numero("R$ 1.250,50") == 1250.50
    assert converter_numero("85000") == 85000.0
    assert converter_numero(None) is None
    assert converter_numero("-") is None
    assert converter_numero("N/A") is None


def test_padronizar_periodo():
    p1 = padronizar_periodo("Jan/26")
    assert p1["mes"] == "Jan"
    assert p1["ano"] == 2026

    p2 = padronizar_periodo("Fevereiro/2026")
    assert p2["mes"] == "Fev"
    assert p2["ano"] == 2026


def test_validar_qualidade_dados():
    dados_mock = {
        "logisticCost": [
            {
                "periodo": "Jan/26",
                "faturamento_musd": "$ 125.40",
                "realizado_pct": "3,03%"
            }
        ]
    }
    dados_limpos, relatorio = validar_qualidade_dados(dados_mock)
    assert dados_limpos["logisticCost"][0]["faturamento_musd"] == 125.40
    assert dados_limpos["logisticCost"][0]["realizado_pct"] == 0.0303
    assert "100% Válido" in relatorio["status_qualidade"]
