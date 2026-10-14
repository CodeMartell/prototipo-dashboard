from src.notifier import EmailNotifier


def test_formatar_html_executivo():
    notifier = EmailNotifier()
    metadata = {
        "origem_email": "financeiro.dxi@lge.com",
        "arquivo_origem": "Fechamento_Semanal.xlsx",
        "status_qualidade": "100% Válido"
    }
    indicadores = {
        "logisticCost": [
            {
                "periodo": "Jan/26",
                "faturamento_musd": 125.4,
                "realizado_pct": 0.0303,
                "target_pct": 0.0315
            }
        ],
        "airFreight": [
            {
                "periodo": "Jan/26",
                "frete_aereo_pct": 0.004,
                "target_pct": 0.0045
            }
        ],
        "logisticsVsProd": [
            {
                "periodo": "Jan/26",
                "razao_custo_prod": 0.0317,
                "valor_producao_musd": 120.0
            }
        ]
    }

    html = notifier.formatar_html_executivo(metadata, indicadores)

    assert "Relatório Executivo de Fechamento Logístico" in html
    assert "Dentro da Meta" in html
    assert "Jan/26" in html
