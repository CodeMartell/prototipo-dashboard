import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class DarkNumberedCanvas(canvas.Canvas):
    """
    Custom canvas that draws a dark background on all pages,
    a red banner on the cover page, and unified headers/footers
    with dynamic total page counts.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def _startPage(self):
        super()._startPage()
        self.saveState()
        width, height = 595.27, 841.89

        # Draw backgrounds first (so they are rendered UNDER the flowables)
        if self._pageNumber == 1:
            # Cover Page: Red Top Block, Dark Grey Bottom
            self.setFillColor(colors.HexColor("#E7194A"))
            self.rect(0, height - 280, width, 280, fill=True, stroke=False)
            
            self.setFillColor(colors.HexColor("#141414"))
            self.rect(0, 0, width, height - 280, fill=True, stroke=False)
        else:
            # Subsequent Pages: All Dark Grey Background
            self.setFillColor(colors.HexColor("#141414"))
            self.rect(0, 0, width, height, fill=True, stroke=False)
        self.restoreState()

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip header/footer on cover page

        self.saveState()
        width, height = 595.27, 841.89

        # Header line and text (pages 2+)
        self.setStrokeColor(colors.HexColor("#303030"))
        self.setLineWidth(0.5)
        self.line(40, height - 40, width - 40, height - 40)
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#E7194A"))
        self.drawString(40, height - 32, "RFC - ESPECIFICAÇÃO TÉCNICA")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#BDBDBD"))
        self.drawString(185, height - 32, "|   Dashboard de KPIs Logísticos LG Electronics DXI")

        # Footers (Pages 2+)
        self.setStrokeColor(colors.HexColor("#303030"))
        self.setLineWidth(0.5)
        self.line(40, 45, width - 40, 45)
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#757575"))
        self.drawString(40, 30, "CONFIDENCIAL — USO INTERNO LG ELECTRONICS DXI")
        
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(width - 40, 30, page_text)
        
        self.restoreState()



def build_pdf():
    pdf_path = r"c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\documento_rfc_dashboard_lgedxi.pdf"
    
    # Configure document with 40pt horizontal margins (net width = 515.27)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Colors
    brand_red = colors.HexColor("#E7194A")
    primary_text = colors.HexColor("#FFFFFF")
    secondary_text = colors.HexColor("#E0E0E0")
    muted_text = colors.HexColor("#BDBDBD")
    dim_text = colors.HexColor("#757575")
    bg_card = colors.HexColor("#1E1E1E")
    bg_elevated = colors.HexColor("#252525")
    border_color = colors.HexColor("#303030")

    # Typography & Styles Config
    cover_tag_style = ParagraphStyle(
        'CoverTag',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#FDE7ED"),
        spaceAfter=15
    )

    cover_title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=primary_text,
        spaceAfter=12
    )

    cover_subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#FBC2CF"),
        spaceAfter=30
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_text,
        spaceBefore=16,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=brand_red,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=secondary_text,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=secondary_text,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )

    card_header_style = ParagraphStyle(
        'CardHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=brand_red,
        spaceAfter=6
    )

    card_text_style = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=secondary_text
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=primary_text,
        alignment=TA_CENTER
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=secondary_text
    )

    tree_style = ParagraphStyle(
        'TreeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#22C55E")
    )

    story = []

    # ==================== PAGE 1: COVER ====================
    story.append(Spacer(1, 30))
    story.append(Paragraph("RFC &amp; ESPECIFICAÇÃO TÉCNICA", cover_tag_style))
    story.append(Paragraph("Dashboard KPIs Logísticos", cover_title_style))
    story.append(Paragraph("Especificação detalhada de funcionamento, regras de negócio e arquitetura de software.", cover_subtitle_style))
    
    story.append(Spacer(1, 100)) # Pushes content below the 280pt red banner
    
    story.append(Paragraph("<font color='#E7194A'><b>RESUMO DAS ENTREGAS DO PROTÓTIPO:</b></font>", ParagraphStyle('CoverIntroLabel', fontName='Helvetica-Bold', fontSize=10, textColor=brand_red, spaceAfter=8)))
    
    bullets = [
        "<font color='#E7194A'>&#9679;</font> <b>Organização do Repositório:</b> Estrutura física de arquivos do Vite React e scripts Python.",
        "<font color='#E7194A'>&#9679;</font> <b>Fórmulas de KPIs:</b> Custos logísticos, frete aéreo, atingimento e variações YoY.",
        "<font color='#E7194A'>&#9679;</font> <b>Arquitetura C4 Model:</b> Mapeamento de contexto, contêineres e fluxo de componentes.",
        "<font color='#E7194A'>&#9679;</font> <b>Qualidade dos Dados:</b> Motor de consistência com regras estatísticas, Z-Score e oscilações MoM.",
        "<font color='#E7194A'>&#9679;</font> <b>Planos de Ação &amp; Evidências:</b> Mecanismos de persistência descentralizada e auditoria em disco.",
    ]
    for b in bullets:
        story.append(Paragraph(b, bullet_style))
        
    story.append(Spacer(1, 55))
    
    # Bottom callout box mimicking "COMO USAR" card
    card_content = """<b>DIRETRIZ CRÍTICA DE PROCESSO:</b><br/>
    Esta documentação formaliza os requisitos homologados junto aos usuários-chave <b>Ruy</b> (Sponsor) e <b>Rafael</b> (Operação) da equipe <b>LG Electronics DXI</b>. O layout visual do protótipo React foi programado com foco em zero cortes de legendas de gráficos e tipografia Inter com números tabulares, servindo de especificação exata para a consolidação final no Power BI Service com prazo até <b>30/08/2026</b>.
    """
    card_table = Table([[Paragraph(card_content, card_text_style)]], colWidths=[515])
    card_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_card),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('PADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(card_table)
    story.append(PageBreak())

    # ==================== PAGE 2: SUMÁRIO &amp; SEÇÃO 1 ====================
    story.append(Spacer(1, 10))
    story.append(Paragraph("Sumário Executivo", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=15))
    
    toc_items = [
        ("1. Visão Geral e Objetivos do Projeto", "Página 2"),
        ("2. Escopo do Projeto e Prazos (Deadline 30/08)", "Página 3"),
        ("3. Mapeamento de Fontes de Dados, Sistemas e Stakeholders", "Página 3"),
        ("4. Regras de Negócio e Cálculos de KPIs (Logistic Cost %)", "Página 4"),
        ("5. Arquitetura de Software — Modelo C4 (Níveis 1 a 4)", "Página 4"),
        ("6. Estrutura do Repositório e Modelo GitFlow", "Página 5"),
        ("7. Detalhamento do Dashboard, Legendas e Tipografia", "Página 5"),
        ("8. Matriz de Riscos Conhecidos e Mitigações", "Página 6"),
        ("9. Roadmap de Evolução do Projeto", "Página 6"),
    ]
    
    toc_data = []
    for item, pg in toc_items:
        p_item = Paragraph(f"<b>{item}</b>", ParagraphStyle('TOCItem', fontName='Helvetica', fontSize=9.5, leading=14, textColor=primary_text))
        p_pg = Paragraph(f"<b>{pg}</b>", ParagraphStyle('TOCPage', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=brand_red, alignment=TA_RIGHT))
        toc_data.append([p_item, p_pg])
        
    toc_table = Table(toc_data, colWidths=[435, 80])
    toc_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, bg_card),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(toc_table)
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("1. Visão Geral e Objetivos do Projeto", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    story.append(Paragraph("<b>1.1 Introdução e Contexto</b>", h2_style))
    story.append(Paragraph(
        "A área de Logística e Administrativo da <b>LG Electronics DXI</b> gerencia operações complexas envolvendo fretes marítimos e aéreos. O projeto estabelece um ecossistema com duas frentes: uma esteira de robôs RPA para automatizar a extração de dados e um Dashboard Analítico para visualização, comparação ano a ano (YoY) e suporte aos planos de ação corretivos no War Room.", body_style
    ))
    story.append(Paragraph("<b>1.2 Problema de Negócio Solucionado</b>", h2_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Consolidação manual ineficiente:</b> A equipe despendia horas copiando dados e formulas manualmente entre planilhas.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Inconsistência de prazos:</b> Falta de confiabilidade de dados antes da entrega de fechamento semanal.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Dificuldade de rastreamento:</b> Ausência de histórico de justificativas e evidências de picos de custo logístico.", bullet_style))
    story.append(PageBreak())

    # ==================== PAGE 3: SEÇÃO 2 &amp; SEÇÃO 3 ====================
    story.append(Spacer(1, 10))
    story.append(Paragraph("2. Escopo do Projeto e Prazos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    # Priority callout box
    crit_card = """<b>FRENTE PRIORITÁRIA DE DESENVOLVIMENTO:</b><br/>
    A entrega visual do Dashboard em Power BI tem prazo de homologação tática estabelecido em <b>30 de Agosto de 2026</b>, sendo tratada como prioridade máxima frente à finalização da automação RPA completa.
    """
    crit_card_table = Table([[Paragraph(crit_card, card_text_style)]], colWidths=[515])
    crit_card_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_card),
        ('BOX', (0,0), (-1,-1), 1, brand_red),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(crit_card_table)
    story.append(Spacer(1, 12))

    scope_data = [
        [Paragraph("Frente de Trabalho", table_header_style), Paragraph("Descrição do Escopo", table_header_style), Paragraph("Entregáveis Principais", table_header_style), Paragraph("Prazo Alvo", table_header_style)],
        [Paragraph("<b>Frente 1: Dashboard BI</b>", table_cell_style), Paragraph("Construção do modelo semântico, telas interativas, cálculos de atingimento YoY e visualização responsiva.", table_cell_style), Paragraph("• Modelo DAX e Medidas<br/>• Layout sem corte de legendas<br/>• Tipografia Inter / Segoe", table_cell_style), Paragraph("<b>30/08/2026</b><br/>(Fase 1)", table_cell_style)],
        [Paragraph("<b>Frente 2: Automação RPA</b>", table_cell_style), Paragraph("Robôs automáticos para leitura de e-mails, extração do GERP, ARUM e Incident Cost.", table_cell_style), Paragraph("• Script de extração GERP/ARUM<br/>• Parser de e-mails do Exchange<br/>• Carga do Staging Data Store", table_cell_style), Paragraph("<b>30/09/2026</b><br/>(Fase 2)", table_cell_style)]
    ]
    scope_table = Table(scope_data, colWidths=[110, 160, 160, 85])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_elevated),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(scope_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("3. Sistemas Corporativos e Stakeholders", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    story.append(Paragraph("<b>3.1 Stakeholders e Papéis</b>", h2_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Ruy (Sponsor):</b> Alinhamento de objetivos estratégicos e homologação visual.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Rafael (Usuário-Chave):</b> Validação das regras de negócio, planilhas e fechamento.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Esdras (Engenharia de Dados):</b> Infraestrutura, acessos e APIs das bases operacionais.", bullet_style))
    story.append(Paragraph("<b>3.2 Sistemas Envolvidos</b>", h2_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>GERP:</b> ERP corporativo de dados oficiais de produção de TVs.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>ARUM System:</b> Gestão física de movimentação e contratos de frete.", bullet_style))
    story.append(Paragraph("<font color='#E7194A'>&#9679;</font> <b>Incident Cost System:</b> Despesas incidentais (demurrage, sinistros).", bullet_style))
    story.append(PageBreak())

    # ==================== PAGE 4: SEÇÃO 4 &amp; SEÇÃO 5 ====================
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Regras de Negócio e Cálculos de KPIs", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    formulas_text = """
    <b>1. Logistic Cost KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Logistic Cost (%) = [ Custo Logístico (ARUM) + Incident Cost (Despesas Incidentais) ] / Volume de Produção (GERP)</i><br/><br/>
    <b>2. Air Freight KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Air Freight (%) = Custo de Frete Aéreo Emergencial / Volume de Produção (GERP)</i><br/><br/>
    <b>3. Achievement (Atingimento da Meta):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Achievement = Target (%) / Result (%)</i> &nbsp;&nbsp;&nbsp;&nbsp;(Nota: Por ser custo, Achievement &ge; 1.0 indica meta cumprida)<br/><br/>
    <b>4. Variação Ano a Ano (YoY %):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>YoY (%) = [ (Resultado 2026 / Resultado 2025) - 1 ] &times; 100</i>
    """
    
    formula_table = Table([[Paragraph(formulas_text, card_text_style)]], colWidths=[515])
    formula_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_card),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(formula_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("5. Arquitetura de Software — Modelo C4", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    story.append(Paragraph("<b>5.1 Nível 1: Diagrama de Contexto (Context)</b>", h2_style))
    c4_level1 = [
        [Paragraph("Elemento", table_header_style), Paragraph("Tipo", table_header_style), Paragraph("Descrição no Ecossistema LG", table_header_style)],
        [Paragraph("<b>Usuários-Chave</b>", table_cell_style), Paragraph("Atores Humanos", table_cell_style), Paragraph("Diretoria DXI (Leitura), Rafael (Operação), Ruy (Homologação).", table_cell_style)],
        [Paragraph("<b>Sistema Core</b>", table_cell_style), Paragraph("Software System", table_cell_style), Paragraph("Automação RPA (Python) + Dashboard Power BI/React.", table_cell_style)],
        [Paragraph("<b>Sistemas Origem</b>", table_cell_style), Paragraph("External System", table_cell_style), Paragraph("GERP (Produção), ARUM (Fretes), Incident Cost (Incidentes), Exchange (E-mails).", table_cell_style)],
    ]
    c4_t1 = Table(c4_level1, colWidths=[120, 110, 285])
    c4_t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_elevated),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(c4_t1)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>5.2 Nível 2: Diagrama de Contêineres (Containers)</b>", h2_style))
    c4_level2 = [
        [Paragraph("Contêiner", table_header_style), Paragraph("Tecnologia", table_header_style), Paragraph("Papel no Ecossistema", table_header_style)],
        [Paragraph("<b>1. Robô RPA</b>", table_cell_style), Paragraph("Python / Outlook API", table_cell_style), Paragraph("Extrai planilhas do e-mail financeiro e dados do ERP.", table_cell_style)],
        [Paragraph("<b>2. Staging DB</b>", table_cell_style), Paragraph("SQL / Excel Consolidado", table_cell_style), Paragraph("Armazena a base histórica saneada (dados.xlsx).", table_cell_style)],
        [Paragraph("<b>3. Frontend UI</b>", table_cell_style), Paragraph("React / Power BI Engine", table_cell_style), Paragraph("Interface interativa com gráficos YoY e painel de anomalias.", table_cell_style)]
    ]
    c4_t2 = Table(c4_level2, colWidths=[110, 130, 275])
    c4_t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_elevated),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(c4_t2)
    story.append(PageBreak())

    # ==================== PAGE 5: SEÇÃO 6 &amp; SEÇÃO 7 ====================
    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Estrutura do Repositório &amp; GitFlow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    # Preformatted code representation for repository structure
    repo_tree_text = """prototipo-dashboard/
├──dados.xlsx                       # Planilha original master de KPIs
├──generate_pdf.py                  # Script unificado ReportLab de documentação
├──generate_pdfs.py                 # Script ReportLab dividido em dois manuais
└──dashboard/                       # Projeto Web React + Vite
   ├──src/
   │  ├──components/                # Painéis (ActionPlan, Sidebar, Header, etc.)
   │  ├──data/
   │  │  └──mockData.js             # Base estática de KPIs Y25 e Y26
   │  ├──utils/
   │  │  ├──analyticsEngine.js      # Validador de consistência e desvios
   │  │  └──formatters.js           # Formatadores de moeda, %, etc.
   │  └──App.jsx                    # Orquestrador global e estados
   └──index.html                    # Ponto de entrada HTML"""
   
    tree_table = Table([[Preformatted(repo_tree_text, tree_style)]], colWidths=[515])
    tree_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_card),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(tree_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>6.1 Modelo de Governança (GitFlow)</b>", h2_style))
    story.append(Paragraph("• <b>main / master:</b> Branches estáveis com o código de produção homologado.", bullet_style))
    story.append(Paragraph("• <b>develop:</b> Branch principal de integração contínua das frentes.", bullet_style))
    story.append(Paragraph("• <b>feature/*:</b> Branches pontuais para novas telas e parsers (ex: <i>feature/ui-header-alerts</i>).", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("7. Diretrizes Visuais de Layout e Tipografia", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    crit_box_text = """<b>DIRETRIZES DE LAYOUT OBRIGATÓRIAS (ZERO CORTE EM LEGENDAS):</b><br/>
    <b>1. Margens e Legendas de Gráficos:</b> A comparação mensal ('2026 (Realizado) \| 2025 (Ano Anterior) \| Target') não deve conter quebras ou cortes visuais em nenhuma resolução de tela.<br/>
    <b>2. Tipografia de Alto Nível:</b> Utilizar a fonte <b>Inter</b> para textos gerais e <b>JetBrains Mono</b> (ou Courier) para exibição de valores tabulares e numéricos, evitando o uso de fontes genéricas para manter a identidade visual DXi.
    """
    crit_table = Table([[Paragraph(crit_box_text, card_text_style)]], colWidths=[515])
    crit_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#3F0F1A")), # Dark red/crimson glow
        ('BOX', (0,0), (-1,-1), 1.5, brand_red),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(crit_table)
    story.append(PageBreak())

    # ==================== PAGE 6: SEÇÃO 8 &amp; SEÇÃO 9 ====================
    story.append(Spacer(1, 10))
    story.append(Paragraph("8. Matriz de Riscos Mapeados", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    risks_data = [
        [Paragraph("Risco Identificado", table_header_style), Paragraph("Impacto", table_header_style), Paragraph("Mitigação Proposta", table_header_style)],
        [Paragraph("<b>Atraso de relatórios por e-mail</b>", table_cell_style), Paragraph("Alto", table_cell_style), Paragraph("Fluxo fallback que carrega as previsões de custo com sinalizador de pendência visual.", table_cell_style)],
        [Paragraph("<b>Mudança no layout da dados.xlsx</b>", table_cell_style), Paragraph("Médio", table_cell_style), Paragraph("Motor RPA de pré-validação de schema das colunas antes da carga no staging.", table_cell_style)],
        [Paragraph("<b>Instabilidades de API no GERP/ARUM</b>", table_cell_style), Paragraph("Alto", table_cell_style), Paragraph("Mecanismo de retry exponencial em horários noturnos fora de pico da rede corporativa.", table_cell_style)]
    ]
    risks_table = Table(risks_data, colWidths=[150, 65, 300])
    risks_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), bg_elevated),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(risks_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph("9. Roadmap de Evolução e Próximos Passos", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceAfter=10))
    
    roadmap_bullets = [
        "<font color='#E7194A'>&#9679;</font> <b>30 de Agosto de 2026:</b> Homologação tática e Go-Live do Dashboard visual no Power BI Service.",
        "<font color='#E7194A'>&#9679;</font> <b>30 de Setembro de 2026:</b> Implementação e testes do robô RPA integrado para extrações automáticas.",
        "<font color='#E7194A'>&#9679;</font> <b>31 de Outubro de 2026:</b> Pipeline totalmente automático de staging e automação de alertas no MS Teams.",
        "<font color='#E7194A'>&#9679;</font> <b>30 de Novembro de 2026:</b> Integração de modelos preditivos estatísticos baseados em IA (Forecasting)."
    ]
    for r in roadmap_bullets:
        story.append(Paragraph(r, bullet_style))

    story.append(Spacer(1, 40))
    story.append(Paragraph("<i>Documentação homologada corporativamente — Equipe de Logística &amp; DXI LG Electronics.</i>", ParagraphStyle('FooterSignature', fontName='Helvetica-Oblique', fontSize=8, textColor=dim_text, alignment=TA_CENTER)))

    # Build the document using the custom dark canvas maker
    doc.build(story, canvasmaker=DarkNumberedCanvas)
    print("Technical RFC PDF compiled successfully!")

if __name__ == '__main__':
    build_pdf()
