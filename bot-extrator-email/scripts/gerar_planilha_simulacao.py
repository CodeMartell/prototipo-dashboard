import os
import pandas as pd


def gerar_planilha_realista_complexa(caminho_saida="caixa_de_entrada/Fechamento_Logistico_Semanal_DXI.xlsx"):
    """
    Gera uma planilha densa, realista e 'poluída' com várias abas extras e dezenas de colunas
    irrelevantes (ERP, SAP, RH, frotas, motoristas), demonstrando o poder do robô de
    filtrar e extrair cirurgicamente apenas os 3 KPIs essenciais.
    """
    os.makedirs(os.path.dirname(caminho_saida), exist_ok=True)

    periodos = ["Jan/26", "Fev/26", "Mar/26", "Abr/26", "Mai/26", "Jun/26", "Jul/26", "Ago/26"]

    # =========================================================================
    # ABA 1: Logistic Cost KPI TV (Com colunas extras de ERP, Centro de Custo, etc.)
    # =========================================================================
    dados_kpi1 = {
        "ID_Registro_ERP": [f"ERP-LOG-{2026000 + i}" for i in range(len(periodos))],
        "Centro_Custo_SAP": ["CC-8420-DXI", "CC-8420-DXI", "CC-8420-DXI", "CC-8421-DXI", "CC-8421-DXI", "CC-8422-DXI", "CC-8422-DXI", "CC-8422-DXI"],
        "Periodo": periodos,
        "Responsavel_Fechamento": ["Carlos Eduardo", "Carlos Eduardo", "Mariana Silva", "Mariana Silva", "Mariana Silva", "Roberto Souza", "Roberto Souza", "Roberto Souza"],
        "Faturamento (MUSD)": ["$ 125.40", "$ 132.10", "$ 128.90", "$ 140.50", "$ 145.20", "$ 138.70", "$ 150.00", "$ 148.30"],
        "Custo Logistico (MUSD)": ["$ 3.80", "$ 4.10", "$ 3.95", "$ 4.25", "$ 4.35", "$ 4.15", "$ 4.40", "$ 4.30"],
        "Realizado %": ["3,03%", "3,10%", "3,06%", "3,02%", "3,00%", "2,99%", "2,93%", "2,90%"],
        "Target %": ["3,15%", "3,15%", "3,15%", "3,10%", "3,10%", "3,05%", "3,05%", "3,00%"],
        "Variacao %": ["-0,12%", "-0,05%", "-0,09%", "-0,08%", "-0,10%", "-0,06%", "-0,12%", "-0,10%"],
        "Taxa_Cambio_Ref": [5.12, 5.15, 5.18, 5.20, 5.22, 5.25, 5.23, 5.21],
        "Observacoes_Auditoria_Interna": [
            "Conferido pelo time fiscal",
            "Ajuste de provisão de frete",
            "Sem pendências",
            "Frete rodoviário renegociado",
            "Dentro do esperado",
            "Auditoria aprovada",
            "Fechamento antecipado",
            "Consolidado final"
        ],
        "Timestamp_Exportacao_ERP": ["2026-08-19 14:32:00"] * len(periodos)
    }

    # =========================================================================
    # ABA 2: Air Freight KPI TV (Com colunas extras de cias aéreas, rotas e taxas)
    # =========================================================================
    dados_kpi2 = {
        "Codigo_Voo_Tracking": [f"AWB-7749-{i}12" for i in range(len(periodos))],
        "Cia_Aerea_Principal": ["LATAM Cargo", "Atlas Air", "Cargolux", "LATAM Cargo", "Kalitta", "Atlas Air", "LATAM Cargo", "Atlas Air"],
        "Periodo": periodos,
        "Aeroporto_Origem": ["MIA", "MIA", "FRA", "MIA", "HKG", "MIA", "FRA", "MIA"],
        "Aeroporto_Destino": ["MAO", "MAO", "MAO", "MAO", "MAO", "MAO", "MAO", "MAO"],
        "Custo Frete Aereo (MUSD)": ["$ 0.50", "$ 0.48", "$ 0.55", "$ 0.42", "$ 0.38", "$ 0.35", "$ 0.30", "$ 0.28"],
        "Faturamento (MUSD)": ["$ 125.40", "$ 132.10", "$ 128.90", "$ 140.50", "$ 145.20", "$ 138.70", "$ 150.00", "$ 148.30"],
        "Frete Aereo %": ["0,40%", "0,36%", "0,43%", "0,30%", "0,26%", "0,25%", "0,20%", "0,19%"],
        "Target %": ["0,45%", "0,45%", "0,45%", "0,40%", "0,40%", "0,35%", "0,35%", "0,30%"],
        "Taxa_Combustivel_Surcharge": ["$ 0.08", "$ 0.07", "$ 0.09", "$ 0.06", "$ 0.05", "$ 0.05", "$ 0.04", "$ 0.04"],
        "Status_Desembaraco_Alfandega": ["Liberado", "Liberado", "Liberado (Canal Verde)", "Liberado", "Liberado", "Liberado", "Liberado", "Liberado"]
    }

    # =========================================================================
    # ABA 3: Logistics vs Prod (Com colunas de linhas de montagem, turnos, refugo)
    # =========================================================================
    dados_kpi3 = {
        "Linha_Montagem_Fabrica": ["Linha OLED-1", "Linha OLED-1", "Linha OLED-2", "Linha OLED-2", "Linha QNED-1", "Linha QNED-1", "Linha UHD-3", "Linha UHD-3"],
        "Turno_Producao": ["Turno A / B", "Turno A / B", "Turno A / B / C", "Turno A / B / C", "Turno A / B", "Turno A / B", "Turno A / B / C", "Turno A / B / C"],
        "Periodo": periodos,
        "Volume Producao (Unidades)": [85000, 89000, 87500, 95000, 98200, 94000, 102000, 100500],
        "Valor Producao (MUSD)": ["$ 120.00", "$ 126.50", "$ 123.00", "$ 135.00", "$ 139.50", "$ 133.00", "$ 144.00", "$ 142.00"],
        "Custo Logistico (MUSD)": ["$ 3.80", "$ 4.10", "$ 3.95", "$ 4.25", "$ 4.35", "$ 4.15", "$ 4.40", "$ 4.30"],
        "Razao Custo/Prod": [0.0317, 0.0324, 0.0321, 0.0315, 0.0312, 0.0312, 0.0306, 0.0303],
        "Indice_Eficiencia_OEE": ["88.5%", "89.2%", "87.8%", "91.0%", "92.3%", "90.1%", "93.5%", "92.8%"],
        "Taxa_Refugo_PPM": [120, 115, 130, 95, 88, 102, 75, 80]
    }

    # =========================================================================
    # ABAS EXTRAS TOTALMENTE IRRELEVANTES (Para provar o poder de filtro do bot)
    # =========================================================================
    dados_frota_caminhoes = {
        "Placa_Veiculo": ["ABC-1234", "XYZ-9876", "LOG-5544", "KLP-3321"],
        "Modelo_Caminhao": ["Volvo FH 540", "Scania R450", "Mercedes Actros", "VW Constellation"],
        "Motorista": ["João Silveira", "Marcos Antunes", "José da Silva", "Pedro Henrique"],
        "Consumo_Medio_Diesel_Km_L": [2.4, 2.6, 2.3, 2.8],
        "Data_Ultima_Revisao": ["2026-07-15", "2026-06-20", "2026-08-01", "2026-07-28"]
    }

    dados_cadastro_fornecedores = {
        "CNPJ_Fornecedor": ["12.345.678/0001-90", "98.765.432/0001-10", "45.678.901/0001-23"],
        "Razao_Social": ["TransLogistica Express SA", "AeroCargas Brasil Ltda", "Porto Seco Manaus Log"],
        "Categoria_Servico": ["Transporte Rodoviário", "Agenciamento Aéreo", "Armazenagem Geral"],
        "Score_Compliance": [98, 95, 92]
    }

    with pd.ExcelWriter(caminho_saida, engine="openpyxl") as writer:
        # Abas dos KPIs (com colunas 'poluídas')
        pd.DataFrame(dados_kpi1).to_excel(writer, sheet_name="Logistic Cost", index=False)
        pd.DataFrame(dados_kpi2).to_excel(writer, sheet_name="Air Freight", index=False)
        pd.DataFrame(dados_kpi3).to_excel(writer, sheet_name="Logistics vs Prod", index=False)
        # Abas extras irrelevantes
        pd.DataFrame(dados_frota_caminhoes).to_excel(writer, sheet_name="Frota_Caminhoes", index=False)
        pd.DataFrame(dados_cadastro_fornecedores).to_excel(writer, sheet_name="Fornecedores", index=False)

    print(f"Planilha realista com abas e colunas complexas gerada em: {caminho_saida}")


if __name__ == "__main__":
    gerar_planilha_realista_complexa()
