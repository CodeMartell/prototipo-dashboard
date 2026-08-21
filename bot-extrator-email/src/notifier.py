import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Any, Dict, List, Optional
from datetime import datetime


class EmailNotifier:
    """
    Responsável por formatar e enviar o Relatório Executivo dos KPIs
    diretamente para a caixa de e-mail do gestor.
    """

    def __init__(
        self,
        servidor_smtp: str = "smtp.gmail.com",
        porta_smtp: int = 587,
        usuario: str = "",
        senha: str = "",
        email_gestor: str = ""
    ):
        self.servidor = servidor_smtp
        self.porta = porta_smtp
        self.usuario = usuario
        self.senha = senha
        self.email_gestor = email_gestor or usuario

    def formatar_html_executivo(self, metadata: Dict[str, Any], indicadores: Dict[str, List[Dict[str, Any]]]) -> str:
        """Gera o layout HTML executivo com cards, badges e tabela dos dados isolados."""
        lc_list = indicadores.get("logisticCost", [])
        af_list = indicadores.get("airFreight", [])
        lp_list = indicadores.get("logisticsVsProd", [])

        # Pega o período mais recente
        ultimo_lc = lc_list[-1] if lc_list else {}
        ultimo_af = af_list[-1] if af_list else {}
        ultimo_lp = lp_list[-1] if lp_list else {}

        periodo_destaque = ultimo_lc.get("periodo", "Recente")

        # KPI 1: Logistic Cost %
        lc_real = ultimo_lc.get("realizado_pct", 0) or 0
        lc_target = ultimo_lc.get("target_pct", 0) or 0
        lc_status_cor = "#10b981" if lc_real <= lc_target else "#ef4444"
        lc_status_texto = "Dentro da Meta 🟢" if lc_real <= lc_target else "Atenção: Acima da Meta 🔴"

        # KPI 2: Air Freight %
        af_real = ultimo_af.get("frete_aereo_pct", 0) or 0
        af_target = ultimo_af.get("target_pct", 0) or 0
        af_status_cor = "#10b981" if af_real <= af_target else "#ef4444"
        af_status_texto = "Dentro da Meta 🟢" if af_real <= af_target else "Acima da Meta 🔴"

        # KPI 3: Logistics Cost x Prod
        lp_razao = ultimo_lp.get("razao_custo_prod", 0) or 0
        lp_prod_musd = ultimo_lp.get("valor_producao_musd", 0) or 0

        # Monta as linhas da tabela consolidada
        linhas_tabela = ""
        total_periodos = max(len(lc_list), len(af_list), len(lp_list))

        for i in range(total_periodos):
            lc = lc_list[i] if i < len(lc_list) else {}
            af = af_list[i] if i < len(af_list) else {}
            lp = lp_list[i] if i < len(lp_list) else {}

            p = lc.get("periodo") or af.get("periodo") or lp.get("periodo") or f"P{i+1}"
            fat = f"${lc.get('faturamento_musd', 0):,.1f}M" if lc.get("faturamento_musd") else "-"
            lc_pct = f"{lc.get('realizado_pct', 0)*100:.2f}%" if lc.get("realizado_pct") is not None else "-"
            lc_tgt = f"{lc.get('target_pct', 0)*100:.2f}%" if lc.get("target_pct") is not None else "-"
            af_pct = f"{af.get('frete_aereo_pct', 0)*100:.2f}%" if af.get("frete_aereo_pct") is not None else "-"
            razao = f"{lp.get('razao_custo_prod', 0):.4f}" if lp.get("razao_custo_prod") is not None else "-"

            linhas_tabela += f"""
            <tr style="border-bottom: 1px solid #e5e7eb; text-align: center;">
                <td style="padding: 10px; font-weight: bold; color: #1f2937;">{p}</td>
                <td style="padding: 10px; color: #4b5563;">{fat}</td>
                <td style="padding: 10px; font-weight: bold; color: #2563eb;">{lc_pct}</td>
                <td style="padding: 10px; color: #6b7280;">{lc_tgt}</td>
                <td style="padding: 10px; font-weight: bold; color: #7c3aed;">{af_pct}</td>
                <td style="padding: 10px; color: #059669;">{razao}</td>
            </tr>
            """

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }}
                .container {{ max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 24px; text-align: center; }}
                .badge-quality {{ display: inline-block; background: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 8px; }}
                .cards-container {{ display: flex; flex-wrap: wrap; gap: 12px; padding: 20px; background: #f9fafb; }}
                .card {{ flex: 1; min-width: 180px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }}
                .card-title {{ font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase; }}
                .card-value {{ font-size: 22px; font-weight: bold; color: #111827; margin: 8px 0; }}
                .card-status {{ font-size: 11px; font-weight: bold; }}
                .content {{ padding: 20px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
                th {{ background: #f3f4f6; color: #374151; padding: 10px; font-weight: 600; }}
                .footer {{ background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0; font-size: 20px;">📊 Relatório Executivo de Fechamento Logístico</h2>
                    <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">War Room & DXI Dashboard</p>
                    <div class="badge-quality">✔ {metadata.get('status_qualidade', '100% Válido')}</div>
                </div>

                <div style="padding: 16px 20px 0 20px; font-size: 13px; color: #4b5563;">
                    <p style="margin: 0;"><strong>Origem:</strong> {metadata.get('origem_email', 'N/D')}</p>
                    <p style="margin: 4px 0 0 0;"><strong>Arquivo Processado:</strong> {metadata.get('arquivo_origem', 'Planilha Excel')}</p>
                </div>

                <!-- CARDS DE DESTAQUE DO ÚLTIMO PERÍODO -->
                <div class="cards-container">
                    <div class="card">
                        <div class="card-title">Custo Logístico ({periodo_destaque})</div>
                        <div class="card-value" style="color: {lc_status_cor};">{lc_real*100:.2f}%</div>
                        <div class="card-status" style="color: {lc_status_cor};">{lc_status_texto} (Meta: {lc_target*100:.2f}%)</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Frete Aéreo ({periodo_destaque})</div>
                        <div class="card-value" style="color: {af_status_cor};">{af_real*100:.2f}%</div>
                        <div class="card-status" style="color: {af_status_cor};">{af_status_texto} (Meta: {af_target*100:.2f}%)</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Custo x Produção</div>
                        <div class="card-value">{lp_razao:.4f}</div>
                        <div class="card-status" style="color: #059669;">Produção: ${lp_prod_musd:,.1f}M</div>
                    </div>
                </div>

                <!-- TABELA DOS DADOS EXTRAÍDOS -->
                <div class="content">
                    <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #1f2937;">📌 Indicadores Isolados Extraídos da Planilha</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Período</th>
                                <th>Faturamento</th>
                                <th>Custo Log. %</th>
                                <th>Meta %</th>
                                <th>Frete Aéreo %</th>
                                <th>Razão Custo/Prod</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas_tabela}
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <p style="margin: 0;">🤖 Este relatório foi gerado automaticamente pelo <strong>Bot Extrator de E-mails (Épico 3)</strong>.</p>
                    <p style="margin: 4px 0 0 0;">Os dados estruturados (JSON/CSV) já estão disponíveis para visualização no Dashboard Web.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html

    def enviar_relatorio(
        self,
        metadata: Dict[str, Any],
        indicadores: Dict[str, List[Dict[str, Any]]],
        destinatario: Optional[str] = None,
        anexos: Optional[List[str]] = None
    ) -> bool:
        """Envia o e-mail formatado para o gestor via SMTP TLS."""
        destino = destinatario or self.email_gestor
        if not destino:
            raise ValueError("Destinatário do relatório não configurado.")

        assunto = f"📊 [Relatório Executivo] Fechamento Logístico DXI - {metadata.get('arquivo_origem', 'Planilha')}"
        corpo_html = self.formatar_html_executivo(metadata, indicadores)

        msg = MIMEMultipart()
        msg["From"] = self.usuario
        msg["To"] = destino
        msg["Subject"] = assunto

        msg.attach(MIMEText(corpo_html, "html", "utf-8"))

        # Anexa os arquivos limpos gerados (ex: CSV)
        if anexos:
            for caminho_anexo in anexos:
                if os.path.exists(caminho_anexo):
                    nome_arquivo = os.path.basename(caminho_anexo)
                    with open(caminho_anexo, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f"attachment; filename={nome_arquivo}")
                    msg.attach(part)

        # Envia via SMTP TLS
        with smtplib.SMTP(self.servidor, self.porta) as server:
            server.starttls()
            server.login(self.usuario, self.senha)
            server.send_message(msg)

        return True
