import os
import json
from src.parser import ExcelParser


def test_parser_extrai_todos_kpis():
    with open("config.json", "r", encoding="utf-8") as f:
        config = json.load(f)

    parser = ExcelParser(config["regras_kpi"])
    caminho_planilha = "caixa_de_entrada/Fechamento_Logistico_Semanal_DXI.xlsx"

    assert os.path.exists(caminho_planilha), "Planilha de teste deve existir em caixa_de_entrada"

    dados = parser.extrair_todos_kpis(caminho_planilha)

    assert "logisticCost" in dados
    assert "airFreight" in dados
    assert "logisticsVsProd" in dados

    assert len(dados["logisticCost"]) == 8
    assert len(dados["airFreight"]) == 8
    assert len(dados["logisticsVsProd"]) == 8

    # Verifica se os campos essenciais foram mapeados
    primeiro_lc = dados["logisticCost"][0]
    assert primeiro_lc["periodo"] == "Jan/26"
    assert primeiro_lc["faturamento_musd"] is not None
