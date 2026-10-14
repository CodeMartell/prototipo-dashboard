from src.email_service import EmailService


def test_filtro_assunto():
    filtros = {
        "termos_assunto_obrigatorios": ["fechamento", "logistico", "war room"],
        "remetentes_autorizados": []
    }
    servico = EmailService(filtros)

    assert servico.assunto_eh_valido("[Fechamento Logístico] Relatório Semanal") is True
    assert servico.assunto_eh_valido("War Room - Custos") is True
    assert servico.assunto_eh_valido("Reunião de Alinhamento Geral") is False


def test_obter_mensagens_simuladas():
    filtros = {
        "termos_assunto_obrigatorios": ["fechamento"],
        "remetentes_autorizados": [],
        "extensoes_anexos_permitidas": [".xlsx", ".xls"]
    }
    servico = EmailService(filtros, pasta_entrada="caixa_de_entrada")
    mensagens = list(servico.obter_mensagens_simuladas())

    assert len(mensagens) >= 1
    assert "Fechamento" in mensagens[0]["assunto"]
    assert len(mensagens[0]["anexos"]) >= 1
