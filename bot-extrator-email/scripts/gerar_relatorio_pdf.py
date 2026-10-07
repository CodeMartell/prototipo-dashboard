import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def gerar_pdf(caminho_pdf="RELATORIO_PROJETO_EPICO3.pdf"):
    doc = SimpleDocTemplate(
        caminho_pdf,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    style_titulo = ParagraphStyle(
        "TituloPrincipal",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=6
    )
    style_subtitulo = ParagraphStyle(
        "Subtitulo",
        parent=styles["Normal"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=14
    )
    style_h2 = ParagraphStyle(
        "SecaoH2",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=12,
        spaceAfter=8
    )
    style_h3 = ParagraphStyle(
        "SecaoH3",
        parent=styles["Heading3"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#111827"),
        spaceBefore=8,
        spaceAfter=4
    )
    style_corpo = ParagraphStyle(
        "CorpoTexto",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#374151"),
        spaceAfter=6
    )
    style_bullet = ParagraphStyle(
        "BulletTexto",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1f2937"),
        leftIndent=15,
        spaceAfter=4
    )
    style_codigo = ParagraphStyle(
        "CodigoBloco",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#111827"),
        backColor=colors.HexColor("#f3f4f6"),
        borderPadding=6,
        spaceAfter=8
    )

    story = []

    # Cabeçalho
    story.append(Paragraph("📄 RELATÓRIO TÉCNICO EXECUTIVO DO PROJETO", style_titulo))
    story.append(Paragraph("<b>Bot Extrator e Normalizador de Dados Logísticos (Épico 3 - War Room / DXI)</b>", style_subtitulo))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=12))

    # Metadados
    dados_meta = [
        [Paragraph("<b>Data:</b> 19/08/2026", style_corpo), Paragraph("<b>Projeto:</b> War Room / DXI Dashboard", style_corpo)],
        [Paragraph("<b>Módulo:</b> Épico 3 (Backend ETL / Automação)", style_corpo), Paragraph("<b>Status:</b> 100% Concluído & Testado", style_corpo)]
    ]
    t_meta = Table(dados_meta, colWidths=[250, 250])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # 1. FINALIDADE DO PROJETO
    story.append(Paragraph("1. 🎯 Finalidade do Projeto", style_h2))
    story.append(Paragraph(
        "O <b>Bot Extrator de E-mails</b> é um serviço autônomo (robô de backend / ETL) desenvolvido para "
        "substituir o processo manual de download, leitura e garimpo de planilhas logísticas semanais recebidas por e-mail.",
        style_corpo
    ))
    story.append(Paragraph("<b>Principais Funções Executadas:</b>", style_h3))
    story.append(Paragraph("• <b>Ingestão IMAP Segura:</b> Conecta ao Gmail corporativo, filtra mensagens por tags de assunto e baixa anexos .xlsx.", style_bullet))
    story.append(Paragraph("• <b>Filtragem Cirúrgica:</b> Descarta abas auxiliares (frotas, fornecedores) e colunas irrelevantes de ERP/SAP, isolando apenas os dados que importam.", style_bullet))
    story.append(Paragraph("• <b>Data Quality & ETL:</b> Converte percentuais ('3,03%' -> 0.0303), moedas ('$ 125.40' -> 125.40) e padroniza datas.", style_bullet))
    story.append(Paragraph("• <b>Alimentação do Dashboard Web:</b> Salva JSON e CSVs estruturados em <code>dados_processados/</code> para a equipe do site/dashboard.", style_bullet))
    story.append(Paragraph("• <b>Entrega ao Gestor:</b> Envia automaticamente por e-mail um Relatório Executivo em HTML com cards de metas e tabela resumida.", style_bullet))
    story.append(Paragraph("• <b>Anti-Duplicidade:</b> Utiliza assinaturas criptográficas SHA-256 para evitar reprocessamento repetido.", style_bullet))

    story.append(Spacer(1, 8))

    # 2. OS 3 KPIS LOGÍSTICOS
    story.append(Paragraph("2. 📊 Os 3 KPIs Logísticos Monitorados", style_h2))
    dados_kpis = [
        ["KPI", "Nome Completo", "O que Mede", "Chave no JSON"],
        ["KPI 1", "Logistic Cost KPI TV", "Custo Logístico Total / Faturamento %", "logisticCost"],
        ["KPI 2", "Air Freight KPI TV", "Frete Aéreo / Faturamento %", "airFreight"],
        ["KPI 3", "Logistics Cost x Prod", "Razão Custo / Volume Produção MUSD", "logisticsVsProd"]
    ]
    t_kpis = Table(dados_kpis, colWidths=[45, 145, 200, 110])
    t_kpis.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_kpis)

    story.append(Spacer(1, 8))

    # 3. FERRAMENTAS E ARQUITETURA
    story.append(Paragraph("3. 🛠️ Ferramentas e Arquitetura Técnica", style_h2))
    story.append(Paragraph("• <b>Linguagem:</b> Python 3.9+ com ambiente virtual <code>.venv</code>.", style_bullet))
    story.append(Paragraph("• <b>Manipulação e ETL:</b> <code>pandas</code>, <code>openpyxl</code>, <code>pydantic</code>.", style_bullet))
    story.append(Paragraph("• <b>Protocolos de Rede:</b> <code>imaplib</code> (IMAP SSL 993) e <code>smtplib</code> (SMTP TLS 587).", style_bullet))
    story.append(Paragraph("• <b>Interface Executiva:</b> <code>rich</code> (Console estilizado com tabelas e badges).", style_bullet))
    story.append(Paragraph("• <b>Segurança e Config:</b> <code>python-dotenv</code> (<code>.env</code> / <code>.env.example</code>) e <code>config.json</code>.", style_bullet))
    story.append(Paragraph("• <b>Qualidade de Código:</b> <code>pytest</code> (8 testes unitários automatizados cobrindo todos os módulos).", style_bullet))

    story.append(Spacer(1, 8))

    # 4. ERROS CORRIGIDOS
    story.append(Paragraph("4. 🔧 Desafios e Erros Corrigidos Durante o Desenvolvimento", style_h2))
    dados_erros = [
        ["Problema Encontrado", "Causa Raiz", "Solução Implementada"],
        [
            "Travamento de Rede no IMAP\n(Caixa com 39.000 e-mails)",
            "Download sequencial do corpo\nde todos os e-mails não lidos.",
            "Busca Indexada no Servidor (SUBJECT) +\nLeitura leve de cabeçalhos (BODY.PEEK)."
        ],
        [
            "Mapeamento de colunas\ncom caracteres especiais",
            "Parênteses e símbolos como\n'Faturamento (MUSD)' e 'Realizado %'.",
            "Algoritmo de limpeza de cabeçalhos e\nbusca por sinônimos em _obter_campo()."
        ],
        [
            "Falha de encoding no\nterminal Windows",
            "Console cp1252 não suportava\nemojis UTF-8.",
            "Reconfiguração automática de sys.stdout\ne sys.stderr para UTF-8."
        ],
        [
            "Controle de e-mails\nlidos e duplicidades",
            "E-mails abertos no webmail\ndeixavam de constar como UNSEEN.",
            "Busca por termos indexados + registro de\nhash SHA-256 + flag --force para reprocessar."
        ]
    ]
    t_erros = Table(dados_erros, colWidths=[130, 160, 210])
    t_erros.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#99f6e4")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_erros)

    story.append(Spacer(1, 10))

    # 5. GUIA DE RETOMADA
    story.append(Paragraph("5. 🚀 Guia de Comandos Rápidos", style_h2))
    comandos_texto = (
        "• Ativar ambiente virtual:      .venv\\Scripts\\activate\n"
        "• Rodar no Modo Real (Gmail):   python extrator.py\n"
        "• Forçar reprocessamento:       python extrator.py --force\n"
        "• Rodar em Simulação (Offline): python extrator.py --simulate\n"
        "• Executar testes unitários:    .venv\\Scripts\\pytest\n"
        "• Diagnóstico de e-mails IMAP:  python scripts/diagnostico_email.py"
    )
    story.append(Paragraph(comandos_texto.replace("\n", "<br/>"), style_codigo))

    # Rodapé
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
    story.append(Paragraph("<i>Relatório gerado automaticamente para documentação e continuidade do projeto.</i>", style_corpo))

    doc.build(story)
    print(f"Relatório PDF gerado com sucesso em: {caminho_pdf}")


if __name__ == "__main__":
    gerar_pdf()
