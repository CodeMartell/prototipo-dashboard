import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, doc_title, *args, **kwargs):
        self.doc_title = doc_title
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(40, 810, f"LG Electronics — DXI | {self.doc_title}")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 802, 555, 802)

        # Footer
        self.line(40, 45, 555, 45)
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(555, 30, page_text)
        self.drawString(40, 30, "CONFIDENCIAL — USO INTERNO LG ELECTRONICS DXI")
        self.restoreState()


def get_styles():
    styles = getSampleStyleSheet()

    primary_color = colors.HexColor("#0F172A")    # Dark Slate Navy
    accent_red = colors.HexColor("#A50034")       # LG Crimson Red
    text_dark = colors.HexColor("#1E293B")        # Main text
    bg_light = colors.HexColor("#F8FAFC")         # Soft slate background

    return {
        'primary': primary_color,
        'red': accent_red,
        'dark': text_dark,
        'bg_light': bg_light,
        'cover_title': ParagraphStyle(
            'CoverTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=28,
            textColor=primary_color,
            spaceAfter=15
        ),
        'cover_subtitle': ParagraphStyle(
            'CoverSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#475569"),
            spaceAfter=25
        ),
        'meta': ParagraphStyle(
            'CoverMeta',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=15,
            textColor=colors.HexColor("#334155")
        ),
        'h1': ParagraphStyle(
            'CustomH1',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=19,
            textColor=primary_color,
            spaceBefore=16,
            spaceAfter=8,
            keepWithNext=True
        ),
        'h2': ParagraphStyle(
            'CustomH2',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=accent_red,
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        ),
        'body': ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13.5,
            textColor=text_dark,
            spaceAfter=8
        ),
        'bullet': ParagraphStyle(
            'CustomBullet',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13.5,
            textColor=text_dark,
            leftIndent=12,
            spaceAfter=4
        ),
        'callout': ParagraphStyle(
            'CalloutText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13.5,
            textColor=colors.HexColor("#854D0E"), # Amber dark
        ),
        'table_hdr': ParagraphStyle(
            'TableHdr',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
            alignment=TA_CENTER
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=text_dark
        ),
        'formula': ParagraphStyle(
            'FormulaStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=13.5,
            textColor=primary_color
        )
    }


def build_pdf_1():
    pdf_path = r"c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\documento_1_funcionamento_dashboard.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    st = get_styles()
    story = []

    # COVER PAGE
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="100%", thickness=5, color=st['red'], spaceAfter=18))
    story.append(Paragraph("DOCUMENTAÇÃO DE FUNCIONAMENTO DO DASHBOARD LOGÍSTICO", st['cover_title']))
    story.append(Paragraph("Manual Operacional, Regras de Negócio e Correções de Layout da Aplicação Analytics", st['cover_subtitle']))
    story.append(Spacer(1, 30))

    meta_text = """
    <b>Aplicação:</b> Plataforma Web de Analytics Logístico (React + Recharts + RPA)<br/>
    <b>Escopo:</b> Área de Logística e Administrativo (LG Electronics DXI)<br/>
    <b>Status:</b> Especificação Operacional v1.0<br/>
    <b>Data:</b> 06 de Agosto de 2026<br/>
    <b>Painéis Cobertos:</b> War Room Report, Air Freight KPI TV, Logistic Cost x Product Amount
    """
    meta_table = Table([[Paragraph(meta_text, st['meta'])]], colWidths=[515])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), st['bg_light']),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 140))
    note_text = "<b>NOTA DE GOVERNANÇA E LAYOUT:</b> Este documento registra as regras de negócio dos 3 painéis de logística, a correção obrigatória do layout de legendas cortadas, a padronização tipográfica Inter e o modelo de governança GitFlow para a plataforma."
    note_table = Table([[Paragraph(note_text, ParagraphStyle('N1', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor("#1E293B")))]], colWidths=[515])
    note_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(note_table)
    story.append(PageBreak())

    # TOC
    story.append(Paragraph("Sumário da Documentação", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=12))

    toc = [
        ("1. Visão Geral e Propósito da Aplicação", "Página 3"),
        ("2. Mapeamento de Fontes de Dados e Pipeline de Ingestão", "Página 3"),
        ("3. Regras de Negócio e Fórmulas dos Indicadores (KPIs)", "Página 3"),
        ("4. Guia de Interpretação dos Gráficos e Funcionalidades", "Página 4"),
        ("5. Matriz de Status: Implementado vs. Planejado", "Página 4"),
        ("6. Ponto Crítico 1 — Ajuste de Layout: Correção de Legendas Cortadas", "Página 5"),
        ("7. Ponto Crítico 2 — Ajuste de Tipografia & Identidade Visual", "Página 5"),
        ("8. Ponto Crítico 3 — Governança de Código e Modelo GitFlow", "Página 5"),
        ("9. Racionalização da Navegação Lateral (Sidebar)", "Página 6"),
    ]
    t_data = []
    for item, pg in toc:
        p1 = Paragraph(f"<b>{item}</b>", ParagraphStyle('T1', fontName='Helvetica', fontSize=9.5, leading=14, textColor=st['primary']))
        p2 = Paragraph(f"<b>{pg}</b>", ParagraphStyle('T2', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=st['red'], alignment=TA_RIGHT))
        t_data.append([p1, p2])
    t_table = Table(t_data, colWidths=[435, 80])
    t_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_table)
    story.append(PageBreak())

    # CONTENT
    story.append(Paragraph("1. Visão Geral e Propósito da Aplicação", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("A <b>Plataforma de Analytics Logístico</b> é a aplicação web central para monitoramento, análise e acompanhamento de planos de ação referentes aos custos operacionais de transporte e produção da <b>LG Electronics (DXI)</b>.", st['body']))
    story.append(Paragraph("A aplicação unifica o acompanhamento de 3 painéis/indicadores vitais:", st['body']))
    story.append(Paragraph("• <b>War Room Report (Logistic Cost KPI TV):</b> Painel executivo principal para análise do custo logístico total como proporção do valor bruto de produção.", st['bullet']))
    story.append(Paragraph("• <b>Air Freight KPI TV:</b> Painel dedicado ao monitoramento estrito de fretes aéreos emergenciais, garantindo alerta precoce sobre aumentos atípicos.", st['bullet']))
    story.append(Paragraph("• <b>Logistic Cost x Product Amount:</b> Painel de correlação financeira entre os valores nominais de custos logísticos (MUSD) e os volumes de produção (MUSD).", st['bullet']))

    story.append(Paragraph("2. Mapeamento de Fontes de Dados e Pipeline de Ingestão", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("Os dados apresentados derivam da consolidação automatizada de 5 origens corporativas principais:", st['body']))
    story.append(Paragraph("• <b>GERP (LG ERP Proprietário):</b> Base oficial dos valores de produção acumulada por mês e registros fiscais.", st['bullet']))
    story.append(Paragraph("• <b>ARUM System:</b> Sistema de gestão de ordens de transporte e movimentação de fretes marítimos e rodoviários.", st['bullet']))
    story.append(Paragraph("• <b>Incident Cost System:</b> Registro corporativo de despesas não planejadas ou sinistros logísticos (sobreestadia/demurrage, avarias, armazenagem extra).", st['bullet']))
    story.append(Paragraph("• <b>Relatórios Financeiros via E-mail:</b> Relatórios semanais e mensais transmitidos pela equipe financeira.", st['bullet']))
    story.append(Paragraph("• <b>Planilha Master (dados.xlsx):</b> Base consolidada de referência para validação dos indicadores temporais.", st['bullet']))

    story.append(Paragraph("3. Regras de Negócio e Fórmulas dos Indicadores (KPIs)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("Todos os indicadores adotam o princípio de <b>'Quanto Menor, Melhor'</b>, onde variações percentuais negativas em relação ao ano anterior indicam aumento de eficiência operacional.", st['body']))

    form_text = """
    <b>1. Logistic Cost KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Logistic Cost (%) = [ Custo Logístico Total (MUSD) + Incident Cost (MUSD) ] / Volume de Produção (MUSD)</i><br/><br/>
    <b>2. Air Freight KPI TV (%):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Air Freight (%) = Custo de Frete Aéreo (MUSD) / Volume de Produção (MUSD)</i><br/><br/>
    <b>3. Logistic Cost x Product Amount Ratio:</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Ratio = Custo Logístico Total (MUSD) / Volume de Produção (MUSD)</i><br/><br/>
    <b>4. Achievement (Atingimento de Meta):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Achievement = Target (%) / Result (%)</i> &nbsp;&nbsp;&nbsp;&nbsp;(Nota: Valores &ge; 1.00 indicam meta atingida)<br/><br/>
    <b>5. Variação Ano a Ano (YoY %):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>YoY (%) = [ (Resultado 2026 / Resultado 2025) - 1 ] &times; 100</i>
    """
    f_table = Table([[Paragraph(form_text, st['formula'])]], colWidths=[515])
    f_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), st['bg_light']),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(f_table)

    story.append(PageBreak())

    story.append(Paragraph("4. Guia de Interpretação dos Gráficos e Funcionalidades", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("• <b>Gráficos Compostos:</b> Exibem o realizado de 2026 em barras, o histórico de 2025 em linha tracejada e a linha Target. Barras em <b>amarelo</b> indicam o melhor resultado e em <b>vermelho</b> o pior.", st['bullet']))
    story.append(Paragraph("• <b>Detecção de Anomalias:</b> Identificação automática de desvios padrão acima de 2&sigma;, realçados na tabela detalhada.", st['bullet']))
    story.append(Paragraph("• <b>Planos de Ação e Evidências:</b> Painel retrátil associado a cada indicador para digitação de causas raiz e simulação de upload de comprovantes operacionais.", st['bullet']))

    story.append(Paragraph("5. Matriz de Status: Implementado vs. Planejado", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))

    st_data = [
        [Paragraph("Recurso / Funcionalidade", st['table_hdr']), Paragraph("Status Atual", st['table_hdr']), Paragraph("Observação Tecnica", st['table_hdr'])],
        [Paragraph("<b>Visuais de Comparação YoY</b>", st['table_cell']), Paragraph("<b>Implementado</b>", st['table_cell']), Paragraph("Gráficos compostos Recharts com filtros Mensal/Trimestral.", st['table_cell'])],
        [Paragraph("<b>Filtro Dinâmico de Período</b>", st['table_cell']), Paragraph("<b>Implementado</b>", st['table_cell']), Paragraph("Alternância em tempo real na interface web.", st['table_cell'])],
        [Paragraph("<b>Detecção de Anomalias (>2&sigma;)</b>", st['table_cell']), Paragraph("<b>Implementado</b>", st['table_cell']), Paragraph("Identificação visual com realce nas tabelas.", st['table_cell'])],
        [Paragraph("<b>Planos de Ação & Evidências</b>", st['table_cell']), Paragraph("<b>Implementado</b>", st['table_cell']), Paragraph("Módulos com estado reativo local.", st['table_cell'])],
        [Paragraph("<b>Ingestão Automática via RPA</b>", st['table_cell']), Paragraph("<b>Planejado</b>", st['table_cell']), Paragraph("Execução em background via scripts Python.", st['table_cell'])],
        [Paragraph("<b>Persistência em Banco SQL</b>", st['table_cell']), Paragraph("<b>Planejado</b>", st['table_cell']), Paragraph("Substituição do mock JS pelo Data Store relacional.", st['table_cell'])],
    ]
    st_table = Table(st_data, colWidths=[150, 100, 265])
    st_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), st['primary']),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(st_table)

    story.append(Spacer(1, 12))

    story.append(Paragraph("6. Ponto Crítico 1 — Ajuste de Layout: Correção de Legendas Cortadas", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    
    crit_layout = """
    <b>ANOMALIA VISUAL CORRIGIDA:</b><br/>
    Nos gráficos dos 3 indicadores, a legenda com os rótulos <b>'2026 (Realizado)'</b>, <b>'2025 (Ano Anterior)'</b> e <b>'Target'</b> apresentava corte na margem inferior.<br/><br/>
    <b>SOLUÇÃO APLICADA NO CÓDIGO:</b><br/>
    Reestruturação do componente container em <b>Flexbox Vertical</b> com altura total de <b>360px</b>, garantindo área dedicada para a legenda no rodapé sem estouro de margem.
    """
    l_box = Table([[Paragraph(crit_layout, st['callout'])]], colWidths=[515])
    l_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF1F2")),
        ('BOX', (0,0), (-1,-1), 1.5, st['red']),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(l_box)

    story.append(Spacer(1, 10))

    story.append(Paragraph("7. Ponto Crítico 2 — Ajuste de Tipografia & Identidade Visual", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("• **Tipografia Padronizada:** Adoção da fonte **Inter** (Google Fonts) e **Segoe UI Semibold**.", st['bullet']))
    story.append(Paragraph("• **Numeração Tabular:** Aplicação de `font-variant-numeric: tabular-nums` para alinhamento vertical dos números financeiros.", st['bullet']))

    story.append(Paragraph("8. Ponto Crítico 3 — Governança de Código e Modelo GitFlow", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("<b>Débito Técnico:</b> Atualmente todo o projeto está na branch <code>main</code>. Projeta-se a adoção imediata do fluxo GitFlow:", st['body']))
    story.append(Paragraph("• <b>main:</b> Código estável em produção.", st['bullet']))
    story.append(Paragraph("• <b>develop:</b> Branch principal de integração.", st['bullet']))
    story.append(Paragraph("• <b>feature/*:</b> Branches isoladas para novas telas ou robôs (ex.: <i>feature/rpa-mail-parser</i>).", st['bullet']))
    story.append(Paragraph("• <b>release/*:</b> Homologação de versão.", st['bullet']))
    story.append(Paragraph("• <b>hotfix/*:</b> Correções emergenciais em produção.", st['bullet']))

    story.append(Paragraph("9. Racionalização da Navegação Lateral (Sidebar)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("Remoção dos menus inativos da Sidebar, mantendo foco exclusivo em âncoras diretas para os 3 pilares da operação: <b>Visão Geral</b>, <b>War Room Report</b>, <b>Air Freight</b> e <b>Cost x Product Amount</b>.", st['body']))

    doc.build(story, canvasmaker=lambda *args, **kwargs: NumberedCanvas("Funcionamento do Dashboard", *args, **kwargs))
    print("PDF 1 generated successfully:", pdf_path)


def build_pdf_2():
    pdf_path = r"c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\documento_2_c4_model_projeto.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    st = get_styles()
    story = []

    # COVER PAGE
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="100%", thickness=5, color=st['red'], spaceAfter=18))
    story.append(Paragraph("DOCUMENTAÇÃO DE ARQUITETURA DE SOFTWARE — C4 MODEL", st['cover_title']))
    story.append(Paragraph("Especificação de Arquitetura do Ecossistema Integrado (RPA + Dashboard App)", st['cover_subtitle']))
    story.append(Spacer(1, 30))

    meta_text = """
    <b>Projeto:</b> Ecossistema de Automação e Analytics Logístico<br/>
    <b>Cliente:</b> LG Electronics — Área de Logística e Administrativo (DXI)<br/>
    <b>Metodologia:</b> C4 Model (Contexto, Contêineres, Componentes e Fluxo Dinâmico)<br/>
    <b>Status:</b> Especificação de Arquitetura v1.0<br/>
    <b>Data:</b> 06 de Agosto de 2026
    """
    meta_table = Table([[Paragraph(meta_text, st['meta'])]], colWidths=[515])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), st['bg_light']),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 140))
    note_text = "<b>NOTA TÉCNICA DE ARQUITETURA:</b> Este documento descreve a topologia em 4 níveis do C4 Model para o ecossistema RPA + Aplicação Dashboard, incluindo o modelo de governança de código GitFlow e requisitos não-funcionais de software."
    note_table = Table([[Paragraph(note_text, ParagraphStyle('N2', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor("#1E293B")))]], colWidths=[515])
    note_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(note_table)
    story.append(PageBreak())

    # TOC
    story.append(Paragraph("Sumário da Arquitetura C4", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=12))

    toc = [
        ("1. Visão Geral da Arquitetura do Ecossistema", "Página 3"),
        ("2. Nível 1: Diagrama de Contexto de Sistema (System Context)", "Página 3"),
        ("3. Nível 2: Diagrama de Contêineres (Containers)", "Página 4"),
        ("4. Nível 3: Diagrama de Componentes (Components)", "Página 4"),
        ("5. Nível 4: Diagrama do Fluxo Dinâmico (Dynamic Flow)", "Página 5"),
        ("6. Arquitetura de Governança de Código & Modelo GitFlow", "Página 5"),
        ("7. Requisitos Não-Funcionais e Ajustes de Design", "Página 5"),
    ]
    t_data = []
    for item, pg in toc:
        p1 = Paragraph(f"<b>{item}</b>", ParagraphStyle('T1', fontName='Helvetica', fontSize=9.5, leading=14, textColor=st['primary']))
        p2 = Paragraph(f"<b>{pg}</b>", ParagraphStyle('T2', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=st['red'], alignment=TA_RIGHT))
        t_data.append([p1, p2])
    t_table = Table(t_data, colWidths=[435, 80])
    t_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_table)
    story.append(PageBreak())

    # CONTENT
    story.append(Paragraph("1. Visão Geral da Arquitetura do Ecossistema", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("O ecossistema de inteligência logística divide-se em duas camadas principais: <b>(1) Robô RPA</b> para automação de coleta de dados de e-mails/ERP, e <b>(2) Dashboard App Frontend</b> construído em React 19 / Recharts para visualização executiva.", st['body']))

    story.append(Paragraph("2. Nível 1: Diagrama de Contexto (System Context)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))

    c1_data = [
        [Paragraph("Elemento C4", st['table_hdr']), Paragraph("Tipo", st['table_hdr']), Paragraph("Descrição no Ecossistema LG", st['table_hdr'])],
        [Paragraph("<b>Usuários-Chave</b>", st['table_cell']), Paragraph("Atores Humanos", st['table_cell']), Paragraph("Equipes de Gestão Logística, Operações e Engenharia de Dados.", st['table_cell'])],
        [Paragraph("<b>Sistema Core (Escopo)</b>", st['table_cell']), Paragraph("Sistema de Software", st['table_cell']), Paragraph("Plataforma integrada RPA + Aplicação Web Analytics Logístico.", st['table_cell'])],
        [Paragraph("<b>Sistemas Externos Origem</b>", st['table_cell']), Paragraph("Sistemas Corporativos", st['table_cell']), Paragraph("GERP (ERP LG), ARUM (Fretes), Incident Cost System e Servidor Exchange.", st['table_cell'])],
    ]
    c1_table = Table(c1_data, colWidths=[130, 110, 275])
    c1_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), st['primary']),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(c1_table)

    story.append(Spacer(1, 10))

    story.append(Paragraph("3. Nível 2: Diagrama de Contêineres (Containers)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))

    c2_data = [
        [Paragraph("Contêiner", st['table_hdr']), Paragraph("Tecnologia", st['table_hdr']), Paragraph("Papel no Sistema", st['table_hdr'])],
        [Paragraph("<b>1. Robô Extrator RPA</b>", st['table_cell']), Paragraph("Python / IMAP / Pandas", st['table_cell']), Paragraph("Lê relatórios por e-mail, extrai dados ERP e alimenta o staging.", st['table_cell'])],
        [Paragraph("<b>2. Staging Data Store</b>", st['table_cell']), Paragraph("SQL DB / Master Excel", st['table_cell']), Paragraph("Armazena dados higienizados e histórico temporal.", st['table_cell'])],
        [Paragraph("<b>3. Transformation Engine</b>", st['table_cell']), Paragraph("Python / JS Engine", st['table_cell']), Paragraph("Calcula regras de negócio (Logistic Cost %, Achievement, YoY, Anomalias).", st['table_cell'])],
        [Paragraph("<b>4. Dashboard Frontend</b>", st['table_cell']), Paragraph("React 19 / Vite / Recharts", st['table_cell']), Paragraph("Interface web responsiva para navegação interativa.", st['table_cell'])],
    ]
    c2_table = Table(c2_data, colWidths=[130, 120, 265])
    c2_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), st['primary']),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(c2_table)

    story.append(PageBreak())

    story.append(Paragraph("4. Nível 3: Diagrama de Componentes (Components)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("Componentes internos do Frontend: <code>KPICard</code>, <code>ComparisonChart</code>, <code>DetailTable</code>, <code>ActionPlanPanel</code>, <code>EvidencePanel</code>, <code>PeriodFilter</code> e <code>Sidebar</code>.", st['body']))

    story.append(Paragraph("5. Nível 4: Diagrama do Fluxo Dinâmico (Dynamic Flow)", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("Sequência operacional: <b>Extração RPA &rarr; Sanitização &rarr; Staging Store &rarr; Processamento YoY &rarr; Renderização UI</b>.", st['body']))

    story.append(Paragraph("6. Arquitetura de Governança de Código & Modelo GitFlow", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("<b>Registro de Débito Técnico:</b> O repositório opera atualmente em branch única (<code>main</code>). Recomenda-se a adoção da topologia GitFlow (<code>main</code>, <code>develop</code>, <code>feature/*</code>, <code>release/*</code>, <code>hotfix/*</code>) para suporte a múltiplos desenvolvedores com isolamento de releases.", st['body']))

    story.append(Paragraph("7. Requisitos Não-Funcionais e Ajustes de Design", st['h1']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
    story.append(Paragraph("• <b>Tipografia Inter:</b> Família tipográfica `Inter` com `tabular-nums` para clareza visual de métricas financeiras.", st['bullet']))
    story.append(Paragraph("• <b>Zero Corte em Legendas:</b> Container flexbox de 360px de altura garantindo visibilidade total das legendas de comparação.", st['bullet']))

    doc.build(story, canvasmaker=lambda *args, **kwargs: NumberedCanvas("Arquitetura C4 Model", *args, **kwargs))
    print("PDF 2 generated successfully:", pdf_path)


if __name__ == '__main__':
    build_pdf_1()
    build_pdf_2()
