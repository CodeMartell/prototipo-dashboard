import sys
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Skip page number on cover page
        
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages 2+)
        self.drawString(40, 810, "LG Electronics — Automação Logística & Administrativo (RPA + Power BI)")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 802, 555, 802)
        
        # Footer
        self.line(40, 45, 555, 45)
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(555, 30, page_text)
        self.drawString(40, 30, "CONFIDENCIAL — USO INTERNO LG ELECTRONICS")
        self.restoreState()

def build_pdf():
    pdf_path = r"c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\documentacao_tecnica_lg_logistica.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0F172A")    # Dark Navy Slate
    accent_red = colors.HexColor("#A50034")       # LG Crimson Red
    text_dark = colors.HexColor("#1E293B")        # Body dark
    bg_light = colors.HexColor("#F8FAFC")         # Soft background
    border_color = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=primary_color,
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#475569"),
        spaceAfter=30
    )

    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=16,
        textColor=colors.HexColor("#334155")
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=accent_red,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=text_dark,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=text_dark,
        leftIndent=15,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#854D0E"), # Dark Amber
        spaceAfter=0
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=text_dark
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 40))
    # Red accent bar
    story.append(HRFlowable(width="100%", thickness=6, color=accent_red, spaceAfter=20))
    story.append(Paragraph("DOCUMENTAÇÃO TÉCNICA DO PROJETO", ParagraphStyle('SubHeader', fontName='Helvetica-Bold', fontSize=10, textColor=accent_red, spaceAfter=8)))
    story.append(Paragraph("Automação Logística & Administrativa LG Electronics", title_style))
    story.append(Paragraph("Plataforma Integrada de Consolidacão de Indicadores, RPA e Dashboard Power BI", subtitle_style))
    
    story.append(Spacer(1, 40))
    
    meta_text = """
    <b>Cliente:</b> LG Electronics — DXI (Área de Logística e Administrativo)<br/>
    <b>Arquitetura:</b> Modelo C4 (System Context, Containers, Components, Dynamic)<br/>
    <b>Status:</b> Especificação Técnica de Integração e Layout v1.0<br/>
    <b>Data de Emissão:</b> 06 de Agosto de 2026<br/>
    <b>Prazo Prioritário do Dashboard (Go-Live):</b> 30 de Agosto de 2026<br/>
    <b>Stakeholders Principais:</b> Ruy (Sponsor), Rafael (Usuário-Chave), Esdras (Engenharia de Dados)
    """
    
    meta_table = Table([[Paragraph(meta_text, meta_style)]], colWidths=[515])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 16),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    
    story.append(Spacer(1, 120))
    
    # Bottom callout on cover
    cover_note = """<b>NOTA DE DIRETRIZ CRÍTICA:</b> Este documento estabelece as regras obrigatórias de arquitetura, governança via GitFlow, fórmulas de negócio e a diretriz de layout para <b>zero corte em legendas de gráficos</b> e tipografia corporativa no Dashboard Power BI com prazo de homologação até 30/08/2026."""
    cover_note_table = Table([[Paragraph(cover_note, ParagraphStyle('CoverNote', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor("#1E293B")))]], colWidths=[515])
    cover_note_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")), # Soft amber
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(cover_note_table)
    story.append(PageBreak())

    # ==================== SUMÁRIO (TOC) ====================
    story.append(Paragraph("Sumário da Documentação", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=15))
    
    toc_items = [
        ("1. Visão Geral e Objetivos do Projeto", "Página 3"),
        ("2. Escopo do Projeto e Prazos (Deadline 30/08)", "Página 3"),
        ("3. Mapeamento de Fontes de Dados, Sistemas e Stakeholders", "Página 4"),
        ("4. Regras de Negócio e Cálculos de KPIs (Logistic Cost %)", "Página 4"),
        ("5. Arquitetura de Software — Modelo C4 (Níveis 1 a 4)", "Página 5"),
        ("6. Estrutura do Repositório e Modelo GitFlow", "Página 6"),
        ("7. Detalhamento do Dashboard, Legendas e Tipografia", "Página 7"),
        ("8. Matriz de Riscos Conhecidos e Mitigações", "Página 8"),
        ("9. Roadmap de Evolução do Projeto", "Página 8"),
    ]
    
    toc_data = []
    for item, pg in toc_items:
        p_item = Paragraph(f"<b>{item}</b>", ParagraphStyle('TOCItem', fontName='Helvetica', fontSize=10, leading=14, textColor=primary_color))
        p_pg = Paragraph(f"<b>{pg}</b>", ParagraphStyle('TOCPage', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=accent_red, alignment=TA_RIGHT))
        toc_data.append([p_item, p_pg])
        
    toc_table = Table(toc_data, colWidths=[435, 80])
    toc_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(toc_table)
    story.append(Spacer(1, 20))
    story.append(PageBreak())

    # ==================== SEÇÃO 1 ====================
    story.append(Paragraph("1. Visão Geral e Objetivos do Projeto", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))
    
    story.append(Paragraph("<b>1.1 Introdução e Contexto</b>", h2_style))
    story.append(Paragraph(
        "A área de Logística e Administrativo da <b>LG Electronics (DXI)</b> gerencia operações estratégicas envolvendo frete marítimo, frete aéreo, custos operacionais e volumes de produção. Historicamente, a consolidação dos dados necessários para a tomada de decisão ocorria de forma manual através de planilhas distribuídas e relatórios recebidos periodicamente via e-mail da equipe financeira e de operações.", body_style
    ))
    story.append(Paragraph(
        "Este projeto estabelece uma solução completa de automação de ponta a ponta composta por duas frentes integradas: <b>(1) Robô RPA</b> para extração e consolidação automática de relatórios do ERP e e-mails, e <b>(2) Dashboard Analítico de Performance (Power BI / Web)</b> para acompanhamento contínuo dos custos logísticos e comparações ano a ano (YoY).", body_style
    ))

    story.append(Paragraph("<b>1.2 Problema de Negócio Solucionado</b>", h2_style))
    story.append(Paragraph("• <b>Gargalo de Consolidação Manual:</b> Alto tempo dispendido na leitura e cópia manual de dados das planilhas <i>War Room Report</i>, <i>Air Freight</i> e <i>Logistic Cost x Product Amount</i>.", bullet_style))
    story.append(Paragraph("• <b>Inconsistência de Prazos:</b> Dependência do envio pontual de e-mails pelo financeiro e risco de erros no preenchimento manual de fórmulas.", bullet_style))
    story.append(Paragraph("• <b>Dificuldade de Comparação Histórica:</b> Complexidade para alternar rapidamente entre visões mensais, trimestrais, semestrais e anuais comparando o período atual contra o ano anterior (ex.: Q1 2026 vs Q1 2025).", bullet_style))
    story.append(Paragraph("• <b>Ausência de Planos de Ação Vinculados:</b> Falta de registro estruturado de justificativas e evidências anexas para picos atípicos de custo.", bullet_style))

    story.append(Paragraph("<b>1.3 Objetivos Estratégicos</b>", h2_style))
    story.append(Paragraph("• Consolidar 100% dos indicadores analíticos logísticos em uma única fonte da verdade corporativa.", bullet_style))
    story.append(Paragraph("• Reduzir o tempo de preparação e saneamento de dados de dias para escassos minutos.", bullet_style))
    story.append(Paragraph("• Garantir visibilidade imediata de desvios e anomalias de custos (efeito <i>'voo de galinha'</i>).", bullet_style))
    story.append(Paragraph("• <b>Entregar a primeira versão funcional e homologada do Dashboard até 30 de Agosto de 2026.</b>", bullet_style))

    story.append(Spacer(1, 15))

    # ==================== SEÇÃO 2 ====================
    story.append(Paragraph("2. Escopo do Projeto e Prazos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    # Callout Box - Priority Deadline
    deadline_box = Table([[Paragraph("<b>PRIORIDADE CRÍTICA DE ENTREGA: DASHBOARD POWER BI — 30 DE AGOSTO DE 2026</b><br/>A entrega da camada de visualização analítica (Dashboard) possui prioridade absoluta de homologação com os executivos Ruy e Rafael antes da conclusão da esteira total do robô RPA.", callout_style)]], colWidths=[515])
    deadline_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#D97706")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(deadline_box)
    story.append(Spacer(1, 10))

    scope_data = [
        [Paragraph("Frente de Trabalho", table_header_style), Paragraph("Descrição do Escopo", table_header_style), Paragraph("Entregáveis Principais", table_header_style), Paragraph("Prazo Alvo", table_header_style)],
        [Paragraph("<b>Frente 1: Dashboard Power BI / Web</b>", table_cell_style), Paragraph("Construção do modelo semântico, telas interativas, comparações YoY e protótipo de alta fidelidade.", table_cell_style), Paragraph("• Modelo DAX<br/>• Layout sem corte de legendas<br/>• Tipografia Inter / Corporate", table_cell_style), Paragraph("<b>30/08/2026</b><br/>(Prioridade 1)", table_cell_style)],
        [Paragraph("<b>Frente 2: Automação RPA</b>", table_cell_style), Paragraph("Desenvolvimento dos robôs de extração automatizada do GERP, ARUM, Incident Cost e e-mails do financeiro.", table_cell_style), Paragraph("• Robô de Leitura de E-mails<br/>• Extrator ERP GERP/ARUM<br/>• Pipeline Staging Data", table_cell_style), Paragraph("<b>30/09/2026</b><br/>(Fase 2)", table_cell_style)]
    ]
    scope_table = Table(scope_data, colWidths=[120, 165, 145, 85])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(scope_table)

    story.append(PageBreak())

    # ==================== SEÇÃO 3 ====================
    story.append(Paragraph("3. Mapeamento de Fontes de Dados, Sistemas e Stakeholders", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph("<b>3.1 Matriz de Stakeholders e Usuários-Chave</b>", h2_style))
    story.append(Paragraph("• <b>Ruy (Sponsor / Solicitante):</b> Responsável pela visão de negócio, homologação final dos KPIs e validação do protótipo visual.", bullet_style))
    story.append(Paragraph("• <b>Rafael (Usuário-Chave de Logística):</b> Responsável operacional pelo fornecimento da planilha <i>dados.xlsx</i> e esclarecimento de regras de negócio.", bullet_style))
    story.append(Paragraph("• <b>Esdras (Engenharia de Dados):</b> Especialista responsável pela infraestrutura de dados e acessos aos sistemas corporativos (ARUM, GERP, Incident Cost).", bullet_style))
    story.append(Paragraph("• <b>Equipe Financeira LG:</b> Origem dos relatórios periódicos de fechamento enviados por e-mail.", bullet_style))

    story.append(Paragraph("<b>3.2 Ecossistema de Sistemas Envolvidos</b>", h2_style))
    story.append(Paragraph("• <b>GERP (LG ERP Proprietário):</b> Sistema ERP corporativo com dados oficiais de produção, vendas e faturamento.", bullet_style))
    story.append(Paragraph("• <b>ARUM System:</b> Sistema interno de gestão de movimentação de fretes e ordens de transporte.", bullet_style))
    story.append(Paragraph("• <b>Incident Cost System:</b> Base corporativa de custos não planejados (sinistros, demurrage, armazenagem extra).", bullet_style))
    story.append(Paragraph("• <b>Servidor Exchange / E-mails:</b> Origem dos relatórios semanais e mensais em anexo Excel.", bullet_style))

    story.append(Spacer(1, 10))

    # ==================== SEÇÃO 4 ====================
    story.append(Paragraph("4. Regras de Negócio e Cálculos de KPIs", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph("<b>4.1 Fórmulas Matemáticas dos Indicadores</b>", h2_style))
    
    formulas_text = """
    <b>1. Logistic Cost KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Logistic Cost (%) = [ Custo Logístico Total (MUSD) + Incident Cost (MUSD) ] / Volume de Produção (MUSD)</i><br/><br/>
    <b>2. Air Freight KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Air Freight (%) = Custo de Frete Aéreo (MUSD) / Volume de Produção (MUSD)</i><br/><br/>
    <b>3. Achievement (Atingimento da Meta):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Achievement = Target (%) / Result (%)</i> &nbsp;&nbsp;&nbsp;&nbsp;(Nota: Se Achievement &ge; 1.0 = Meta Atingida)<br/><br/>
    <b>4. Variação Ano a Ano (YoY %):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>YoY (%) = [ (Resultado 2026 / Resultado 2025) - 1 ] &times; 100</i>
    """
    
    formula_table = Table([[Paragraph(formulas_text, ParagraphStyle('FormulaStyle', fontName='Helvetica', fontSize=9, leading=14, textColor=primary_color))]], colWidths=[515])
    formula_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(formula_table)

    story.append(Paragraph("<b>4.2 Princípio do Desempenho: 'Quanto Menor, Melhor'</b>", h2_style))
    story.append(Paragraph(
        "Por se tratar de indicadores de custo em relação à receita/produção, <b>valores menores indicam maior eficiência financeira</b>. "
        "Uma variação YoY negativa (ex.: -1.3%) representa economia efetiva de recursos.", body_style
    ))

    story.append(PageBreak())

    # ==================== SEÇÃO 5 ====================
    story.append(Paragraph("5. Arquitetura de Software — Modelo C4 (C4 Model)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    story.append(Paragraph("<b>5.1 Nível 1: Diagrama de Contexto (System Context)</b>", h2_style))
    story.append(Paragraph(
        "O sistema engloba a interação entre os atores (Ruy, Rafael, Diretoria, Financeiro), os sistemas externos (GERP, ARUM, Incident Cost, Exchange) e o núcleo de automação e analytics da LG.", body_style
    ))

    c4_level1 = [
        [Paragraph("Elemento C4", table_header_style), Paragraph("Tipo", table_header_style), Paragraph("Descrição no Ecossistema LG", table_header_style)],
        [Paragraph("<b>Usuários-Chave</b>", table_cell_style), Paragraph("Atores Humanos", table_cell_style), Paragraph("Ruy (Sponsor/Aprovação), Rafael (Operação Logística), Diretoria DXI (Tomada de Decisão).", table_cell_style)],
        [Paragraph("<b>Sistema Core (Escopo)</b>", table_cell_style), Paragraph("Sistema de Software", table_cell_style), Paragraph("Plataforma integrada RPA + Dashboard Power BI para consolidação e análise de custos.", table_cell_style)],
        [Paragraph("<b>Sistemas Origem</b>", table_cell_style), Paragraph("Sistemas Externos", table_cell_style), Paragraph("GERP (ERP LG), ARUM (Fretes), Incident Cost (Sinistros) e Servidor de E-mail Exchange.", table_cell_style)],
    ]
    c4_t1 = Table(c4_level1, colWidths=[130, 110, 275])
    c4_t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(c4_t1)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>5.2 Nível 2: Diagrama de Contêineres (Containers)</b>", h2_style))
    c4_level2 = [
        [Paragraph("Contêiner", table_header_style), Paragraph("Tecnologia", table_header_style), Paragraph("Papel no Sistema", table_header_style)],
        [Paragraph("<b>1. Robô RPA</b>", table_cell_style), Paragraph("Python / UiPath", table_cell_style), Paragraph("Extrai dados do GERP, ARUM, Incident Cost e lê e-mails com relatórios anexos.", table_cell_style)],
        [Paragraph("<b>2. Staging Data Store</b>", table_cell_style), Paragraph("SQL DB / Excel Master", table_cell_style), Paragraph("Armazena os dados sanitizados e prontos para consumo pelo BI.", table_cell_style)],
        [Paragraph("<b>3. Modelo Semântico BI</b>", table_cell_style), Paragraph("Power BI / DAX Engine", table_cell_style), Paragraph("Calcula medidas DAX, agregações temporais (Mensal/Trimestral) e inteligência temporal YoY.", table_cell_style)],
        [Paragraph("<b>4. Frontend UI</b>", table_cell_style), Paragraph("Power BI Service / React", table_cell_style), Paragraph("Interface do Dashboard para os usuários finais com filtros interativos.", table_cell_style)],
    ]
    c4_t2 = Table(c4_level2, colWidths=[120, 120, 275])
    c4_t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(c4_t2)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>5.3 Nível 3 & 4: Componentes & Fluxo Dinâmico</b>", h2_style))
    story.append(Paragraph("• <b>Módulos RPA:</b> <i>MailExtractor</i> &rarr; <i>ERPExtractor</i> &rarr; <i>DataSanitizer</i> &rarr; <i>Consolidator</i>.", bullet_style))
    story.append(Paragraph("• <b>Componentes Dashboard:</b> <i>KPICardSummary</i>, <i>ComparisonChart (Bar+Line)</i>, <i>PeriodFilter</i>, <i>ActionPlanPanel</i>.", bullet_style))
    story.append(Paragraph("• <b>Sequência Dinâmica:</b> O robô executa a limpeza, grava no Staging, o DAX recalcula as variações YoY e o Dashboard exibe as telas formatadas.", bullet_style))

    story.append(Spacer(1, 15))

    # ==================== SEÇÃO 6 ====================
    story.append(Paragraph("6. Estrutura do Repositório e Modelo GitFlow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))
    story.append(Paragraph(
        "Para governança e controle de versão do código (RPA, Scripts DAX e Protótipo Web), adota-se o modelo <b>GitFlow</b>:", body_style
    ))
    story.append(Paragraph("• <b>main / master:</b> Código estável homologado em produção.", bullet_style))
    story.append(Paragraph("• <b>develop:</b> Branch principal de integração contínua.", bullet_style))
    story.append(Paragraph("• <b>feature/*:</b> Branches de desenvolvimento (ex.: <i>feature/dashboard-lovable-ui</i>, <i>feature/rpa-mail-parser</i>).", bullet_style))
    story.append(Paragraph("• <b>release/*:</b> Branch de preparação para homologação (ex.: <i>release/v1.0.0-dashboard-august</i>).", bullet_style))
    story.append(Paragraph("• <b>hotfix/*:</b> Correções emergenciais em produção (ex.: <i>hotfix/layout-legend-cutoff-fix</i>).", bullet_style))

    story.append(PageBreak())

    # ==================== SEÇÃO 7 ====================
    story.append(Paragraph("7. Detalhamento do Dashboard, Legendas e Tipografia", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    # CRITICAL REQUIREMENTS CALLOUT BOX
    crit_box_data = [
        [Paragraph("<b>DIRETRIZES VISUAIS OBRIGATÓRIAS (AJUSTES DE LAYOUT E TIPOGRAFIA)</b>", ParagraphStyle('CritTitle', fontName='Helvetica-Bold', fontSize=10, textColor=accent_red))],
        [Paragraph(
            "<b>1. Zero Corte em Legendas de Gráficos:</b><br/>"
            "Todas as legendas de comparação — especificamente: <b>'2026 (Realizado) | 2025 (Ano Anterior) | Target'</b> e demais legendas inferiores — devem estar 100% visíveis na tela e na documentação PDF, sem qualquer oclusão ou corte de margem.<br/><br/>"
            "<b>2. Tipografia Corporativa Autêntica (Evitar Fonte Padrão Genérica):</b><br/>"
            "Substituição das fontes padrão genéricas do Power BI pela família tipográfica <b>Inter</b> (Google Fonts) ou <b>Segoe UI Semibold</b> com números tabulares, garantindo estética de nível corporativo e facilidade de leitura financeira.",
            ParagraphStyle('CritBody', fontName='Helvetica', fontSize=9, leading=14, textColor=text_dark)
        )]
    ]
    crit_box = Table(crit_box_data, colWidths=[515])
    crit_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF1F2")),
        ('BOX', (0,0), (-1,-1), 1.5, accent_red),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(crit_box)
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>Catálogo de Visuais do Dashboard</b>", h2_style))
    charts_data = [
        [Paragraph("Visual", table_header_style), Paragraph("Tipo de Gráfico", table_header_style), Paragraph("Dados Exibidos", table_header_style), Paragraph("Propósito Operacional", table_header_style)],
        [Paragraph("<b>KPI Cards (Linha 1 e 2)</b>", table_cell_style), Paragraph("Cards com Sparkline", table_cell_style), Paragraph("Realizado, Target, Variação YoY %, Valor Histórico", table_cell_style), Paragraph("Leitura rápida dos números principais do topo do funil.", table_cell_style)],
        [Paragraph("<b>Evolução Custo Logístico</b>", table_cell_style), Paragraph("Composto (Barra + Linha)", table_cell_style), Paragraph("Barras 2026 vs Linha 2025 vs Linha Target", table_cell_style), Paragraph("Comparar mês a mês o gasto com o ano anterior e com a meta.", table_cell_style)],
        [Paragraph("<b>Air Freight KPI TV</b>", table_cell_style), Paragraph("Composto (Barra + Linha)", table_cell_style), Paragraph("Frete Aéreo 2026 vs 2025 vs Meta 0.22%", table_cell_style), Paragraph("Detectar aumentos em fretes aéreos emergenciais.", table_cell_style)],
        [Paragraph("<b>Logistics vs Production</b>", table_cell_style), Paragraph("Combo (Barra + Linha)", table_cell_style), Paragraph("Custo Logístico (MUSD) vs Produção (MUSD)", table_cell_style), Paragraph("Verificar se o custo subiu proporcionalmente à produção.", table_cell_style)],
        [Paragraph("<b>Tabela de Detalhamento</b>", table_cell_style), Paragraph("Data Grid Condicional", table_cell_style), Paragraph("Valores exatos por mês + Ícones Troféu/Alerta", table_cell_style), Paragraph("Auditabilidade detalhada mês a mês com realce de anomalias.", table_cell_style)],
    ]
    charts_table = Table(charts_data, colWidths=[110, 105, 150, 150])
    charts_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(charts_table)

    story.append(Spacer(1, 15))

    # ==================== SEÇÃO 8 & 9 ====================
    story.append(Paragraph("8. Matriz de Riscos Conhecidos e Mitigações", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))

    risks_data = [
        [Paragraph("Risco Mapeado", table_header_style), Paragraph("Impacto", table_header_style), Paragraph("Mitigação Proposta", table_header_style)],
        [Paragraph("<b>Atraso nos e-mails do Financeiro</b>", table_cell_style), Paragraph("Alto", table_cell_style), Paragraph("Alerta automático no RPA + Fallback para dados da última semana com sinalização de pendência.", table_cell_style)],
        [Paragraph("<b>Alteração no layout da planilha dados.xlsx</b>", table_cell_style), Paragraph("Médio", table_cell_style), Paragraph("Validador de schema no RPA com log de erro descritivo antes do carregamento no BI.", table_cell_style)],
        [Paragraph("<b>Instabilidade de conexão no GERP/ARUM</b>", table_cell_style), Paragraph("Alto", table_cell_style), Paragraph("Politica de <i>retry</i> com recuo exponencial e execução fora do horário de pico do servidor.", table_cell_style)],
    ]
    risks_table = Table(risks_data, colWidths=[160, 65, 290])
    risks_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(risks_table)

    story.append(Spacer(1, 15))

    story.append(Paragraph("9. Roadmap de Evolução do Projeto", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=10))
    story.append(Paragraph("• <b>30 de Agosto de 2026 (MILESTONE PRINCIPAL):</b> Go-Live da versão final do Dashboard no Power BI Service com legendas 100% ajustadas e tipografia Inter.", bullet_style))
    story.append(Paragraph("• <b>30 de Setembro de 2026:</b> Homologação dos Robôs RPA de extração automática do ERP e e-mails.", bullet_style))
    story.append(Paragraph("• <b>31 de Outubro de 2026:</b> Automação completa do pipeline de carga sem intervenção manual e alertas no Teams.", bullet_style))
    story.append(Paragraph("• <b>30 de Novembro de 2026:</b> Inclusão de módulo de Inteligência Artificial para Previsão de Custos Logísticos (Forecasting).", bullet_style))

    story.append(Spacer(1, 20))
    story.append(Paragraph("<i>Documentação homologada para o projeto LG Electronics DXI — Logística & Administrativo.</i>", ParagraphStyle('FooterSign', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.HexColor("#64748B"), alignment=TA_CENTER)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF generated successfully at:", pdf_path)

if __name__ == '__main__':
    build_pdf()
