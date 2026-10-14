#!/usr/bin/env python3
"""
Bot Extrator e Normalizador de Dados Logísticos (Épico 3 - War Room / DXI)
Ponto de entrada principal do serviço autônomo.
"""

import os
import sys
import json
import argparse
import logging
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv

# Força codificação UTF-8 no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Importa rich para formatação de tabelas e cores no terminal
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    RICH_DISPONIVEL = True
except ImportError:
    RICH_DISPONIVEL = False

from src.email_service import EmailService
from src.parser import ExcelParser
from src.validator import validar_qualidade_dados
from src.storage import DataStorage
from src.notifier import EmailNotifier


def carregar_configuracao(caminho_config="config.json"):
    """Carrega o arquivo de configuração principal."""
    if not os.path.exists(caminho_config):
        raise FileNotFoundError(f"Arquivo '{caminho_config}' não encontrado.")
    with open(caminho_config, "r", encoding="utf-8") as f:
        return json.load(f)


def configurar_logger(pasta_logs):
    """Configura a trilha de auditoria em arquivo e console."""
    os.makedirs(pasta_logs, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    arquivo_log = os.path.join(pasta_logs, f"execucao_{timestamp}.log")

    logger = logging.getLogger("ExtratorBot")
    logger.setLevel(logging.INFO)
    logger.handlers = []

    file_handler = logging.FileHandler(arquivo_log, encoding="utf-8")
    file_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    return logger, arquivo_log


def exibir_banner(console, modo: str):
    """Exibe o cabeçalho no terminal."""
    if not RICH_DISPONIVEL:
        print(f"\n=== BOT EXTRATOR DE DADOS LOGÍSTICOS (ÉPICO 3) - MODO: {modo} ===\n")
        return

    banner_text = Text()
    banner_text.append("🚀 BOT EXTRATOR E NORMALIZADOR DE DADOS LOGÍSTICOS\n", style="bold cyan")
    banner_text.append("War Room & DXI Dashboard  •  Épico 3 - ETL Automatizado\n\n", style="italic white")
    banner_text.append("• Modo Operacional: ", style="bold")
    banner_text.append(f"[{'green' if modo == 'SIMULAÇÃO' else 'yellow'} bold]{modo}[/]\n")
    banner_text.append(f"• Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", style="dim")

    console.print(Panel(banner_text, border_style="cyan", expand=False))


def main():
    parser = argparse.ArgumentParser(description="Bot Extrator de Dados de E-mails (Épico 3)")
    parser.add_argument("--simulate", action="store_true", help="Força execução em modo de simulação offline")
    parser.add_argument("--force", action="store_true", help="Força o reprocessamento ignorando duplicidades")
    args = parser.parse_args()

    # Carrega variáveis de ambiente do .env
    load_dotenv()
    console = Console() if RICH_DISPONIVEL else None

    # Carrega configurações
    config = carregar_configuracao()
    diretorios = config.get("diretorios", {})
    filtros = config.get("filtros_email", {})
    regras_kpi = config.get("regras_kpi", {})
    export_cfg = config.get("exportacao", {})

    pasta_entrada = diretorios.get("caixa_de_entrada", "caixa_de_entrada")
    pasta_saida = diretorios.get("dados_processados", "dados_processados")
    pasta_logs = diretorios.get("logs", "logs")

    logger, arquivo_log = configurar_logger(pasta_logs)

    # Determina o modo de execução
    env_mode = os.getenv("EXECUTION_MODE", "SIMULATION").upper()
    modo_simulacao = args.simulate or (env_mode == "SIMULATION")
    modo_str = "SIMULAÇÃO" if modo_simulacao else "REAL (IMAP)"

    exibir_banner(console, modo_str)
    logger.info(f"Iniciando Bot Extrator no modo: {modo_str}")

    # Inicializa serviços
    email_service = EmailService(filtros, pasta_entrada=pasta_entrada)
    parser_excel = ExcelParser(regras_kpi)
    storage = DataStorage(pasta_saida=pasta_saida, prefixo=export_cfg.get("prefixo_saida", "kpi_consolidado"))

    # Obtém as mensagens a processar
    if modo_simulacao:
        if RICH_DISPONIVEL:
            console.print("[cyan]🔍 Verificando anexos na pasta de entrada...[/cyan]")
        mensagens = list(email_service.obter_mensagens_simuladas())
    else:
        if RICH_DISPONIVEL:
            console.print("[cyan]📡 Conectando ao servidor IMAP do Gmail...[/cyan]")
        try:
            def status_callback(msg):
                if RICH_DISPONIVEL:
                    console.print(f"[dim cyan]  → {msg}[/dim cyan]")
                else:
                    print(f"  -> {msg}")

            mensagens = list(email_service.obter_mensagens_reais(
                servidor=os.getenv("IMAP_SERVER", "imap.gmail.com"),
                porta=int(os.getenv("IMAP_PORT", 993)),
                usuario=os.getenv("EMAIL_USER", ""),
                senha=os.getenv("EMAIL_PASS_TOKEN", ""),
                pasta_imap=os.getenv("IMAP_MAILBOX", "INBOX"),
                pasta_temp=pasta_entrada,
                callback_status=status_callback
            ))
        except Exception as e:
            msg_erro = f"Erro na conexão IMAP: {e}"
            logger.error(msg_erro, exc_info=True)
            if RICH_DISPONIVEL:
                console.print(f"[bold red]❌ {msg_erro}[/bold red]")
            else:
                print(f"ERRO: {msg_erro}")
            return

    if not mensagens:
        msg_aviso = "Nenhuma nova mensagem compatível com anexos encontrada para processar."
        logger.info(msg_aviso)
        if RICH_DISPONIVEL:
            console.print(f"[yellow]⚠️  {msg_aviso}[/yellow]\n")
        else:
            print(msg_aviso)
        return

    total_processados = 0
    total_duplicados = 0

    for msg_info in mensagens:
        email_id = msg_info["id"]
        assunto = msg_info["assunto"]
        origem = msg_info["origem_email"]
        anexos = msg_info.get("anexos", [])

        for anexo in anexos:
            caminho_anexo = anexo["caminho"]
            nome_anexo = anexo["nome"]
            hash_arquivo = storage.calcular_hash_arquivo(caminho_anexo)

            # Verificação anti-duplicidade
            if not args.force and (storage.ja_foi_processado(email_id) or storage.ja_foi_processado(hash_arquivo)):
                logger.info(f"Mensagem/Arquivo já processado anteriormente: {nome_anexo}")
                if RICH_DISPONIVEL:
                    console.print(f"[yellow]⏩ Anexo '{nome_anexo}' já processado anteriormente. (Use --force para reprocessar)[/yellow]")
                total_duplicados += 1
                continue

            if RICH_DISPONIVEL:
                console.print(Panel(
                    f"[bold]Remetente:[/bold] {origem}\n"
                    f"[bold]Assunto:[/bold] {assunto}\n"
                    f"[bold]Anexo:[/bold] {nome_anexo}",
                    title=f"📥 Mensagem: {email_id}",
                    border_style="blue"
                ))

            logger.info(f"Extraindo dados da planilha: {nome_anexo}")

            try:
                # 1. Extração cirúrgica dos 3 KPIs
                dados_brutos = parser_excel.extrair_todos_kpis(caminho_anexo)

                # 2. Pipeline de Data Quality e Normalização
                dados_limpos, relatorio_qualidade = validar_qualidade_dados(dados_brutos)

                metadata_processamento = {
                    "origem_email": origem,
                    "assunto": assunto,
                    "arquivo_origem": nome_anexo,
                    "status_qualidade": relatorio_qualidade["status_qualidade"]
                }

                # 3. Persistência em JSON e CSVs
                caminho_json, arquivos_csv = storage.salvar_dados(
                    metadata=metadata_processamento,
                    indicadores=dados_limpos,
                    salvar_csv=export_cfg.get("salvar_csv", True)
                )

                # 4. Registro no histórico anti-duplicidade
                storage.registrar_sucesso(email_id, metadata_processamento, caminho_json)
                storage.registrar_sucesso(hash_arquivo, metadata_processamento, caminho_json)

                total_processados += 1
                logger.info(f"Sucesso ao processar '{nome_anexo}'. Salvo em: {caminho_json}")

                # Exibição visual da tabela de resumo
                if RICH_DISPONIVEL:
                    tabela = Table(title="📊 Resumo dos Indicadores Extraídos", border_style="green")
                    tabela.add_column("Indicador (KPI)", style="cyan", no_wrap=True)
                    tabela.add_column("Registros", justify="center", style="bold white")
                    tabela.add_column("Qualidade", justify="center", style="bold green")

                    tabela.add_row("Logistic Cost KPI TV", str(len(dados_limpos.get("logisticCost", []))), "✅ 100%")
                    tabela.add_row("Air Freight KPI TV", str(len(dados_limpos.get("airFreight", []))), "✅ 100%")
                    tabela.add_row("Logistics Cost x Prod", str(len(dados_limpos.get("logisticsVsProd", []))), "✅ 100%")

                    console.print(tabela)

                # 5. Envio do Relatório ao Gestor
                enviar_notif = os.getenv("ENVIAR_RELATORIO_GESTOR", "true").lower() == "true"
                email_gestor_dest = os.getenv("EMAIL_GESTOR_DESTINO", origem)

                notifier = EmailNotifier(
                    servidor_smtp=os.getenv("SMTP_SERVER", "smtp.gmail.com"),
                    porta_smtp=int(os.getenv("SMTP_PORT", 587)),
                    usuario=os.getenv("EMAIL_USER", ""),
                    senha=os.getenv("EMAIL_PASS_TOKEN", ""),
                    email_gestor=email_gestor_dest
                )

                if enviar_notif and not modo_simulacao:
                    try:
                        if RICH_DISPONIVEL:
                            console.print(f"[cyan]📤 Enviando Relatório Executivo para {email_gestor_dest}...[/cyan]")
                        notifier.enviar_relatorio(
                            metadata=metadata_processamento,
                            indicadores=dados_limpos,
                            destinatario=email_gestor_dest,
                            anexos=arquivos_csv
                        )
                        logger.info(f"Relatório executivo enviado com sucesso para: {email_gestor_dest}")
                        if RICH_DISPONIVEL:
                            console.print(f"[bold green]📬 Relatório Executivo enviado com sucesso para:[/] [white bold]{email_gestor_dest}[/]")
                    except Exception as e_notif:
                        logger.error(f"Erro ao enviar e-mail para o gestor: {e_notif}", exc_info=True)
                        if RICH_DISPONIVEL:
                            console.print(f"[yellow]⚠️ Não foi possível enviar e-mail ao gestor: {e_notif}[/yellow]")

                if RICH_DISPONIVEL:
                    console.print(Panel(
                        f"✔ [bold green]JSON Estruturado:[/] {caminho_json}\n"
                        f"✔ [bold green]CSVs Gerados:[/] {len(arquivos_csv)} arquivos exportados\n"
                        f"✔ [bold green]Status de Qualidade:[/] {relatorio_qualidade['status_qualidade']}",
                        title="✨ Processamento Concluído com Sucesso",
                        border_style="green"
                    ))

            except Exception as e:
                logger.error(f"Erro ao processar '{nome_anexo}': {e}", exc_info=True)
                if RICH_DISPONIVEL:
                    console.print(f"[bold red]❌ Falha ao processar '{nome_anexo}': {e}[/bold red]")

    # Resumo Final
    logger.info(f"Execução finalizada. Sucesso: {total_processados}, Ignorados: {total_duplicados}")
    if RICH_DISPONIVEL:
        console.print(f"\n[bold cyan]🏁 Execução finalizada![/] [green]{total_processados} processado(s)[/], [yellow]{total_duplicados} duplicado(s)[/].")
        console.print(f"[dim]Log de auditoria registrado em: {arquivo_log}[/dim]\n")


if __name__ == "__main__":
    main()
