#!/usr/bin/env python3
"""
Script de Diagnóstico Rápido da Conexão IMAP / Gmail
Permite testar a autenticação, listar e-mails não lidos e verificar filtros em segundos.
"""

import os
import sys
import json
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv

# Força codificação UTF-8 no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

load_dotenv()
console = Console()


def decodificar(texto):
    if not texto:
        return ""
    partes = decode_header(texto)
    res = ""
    for p, enc in partes:
        if isinstance(p, bytes):
            res += p.decode(enc or "utf-8", errors="replace")
        else:
            res += str(p)
    return res


def diagnosticar():
    console.print(Panel("[bold cyan]🔍 DIAGNÓSTICO DA CONEXÃO DE E-MAIL (IMAP)[/bold cyan]", border_style="cyan"))

    servidor = os.getenv("IMAP_SERVER", "imap.gmail.com")
    porta = int(os.getenv("IMAP_PORT", 993))
    usuario = os.getenv("EMAIL_USER", "")
    senha = os.getenv("EMAIL_PASS_TOKEN", "")

    console.print(f"• [bold]Servidor:[/bold] {servidor}:{porta}")
    console.print(f"• [bold]Usuário:[/bold] {usuario}")
    console.print(f"• [bold]Senha Token:[/bold] {'*' * len(senha) if senha else '[red]NÃO CONFIGURADO[/red]'}\n")

    if not usuario or not senha:
        console.print("[bold red]❌ Credenciais não preenchidas no .env[/bold red]")
        return

    try:
        console.print("[cyan]Tentando conectar e autenticar...[/cyan]")
        conexao = imaplib.IMAP4_SSL(servidor, porta)
        conexao.login(usuario, senha)
        conexao.select("INBOX")
        console.print("[bold green]✅ Autenticação realizada com sucesso![/bold green]\n")

        with open("config.json", "r", encoding="utf-8") as f:
            config = json.load(f)
        termos_validos = [t.lower() for t in config.get("filtros_email", {}).get("termos_assunto_obrigatorios", [])]

        status, msgs = conexao.search(None, "UNSEEN")
        if status != "OK" or not msgs[0]:
            console.print("[yellow]ℹ️  Não há mensagens NÃO LIDAS na Caixa de Entrada neste momento.[/yellow]")
            console.print("[dim]Dica: Envie um e-mail com anexo .xlsx e mantenha-o como não lido para testar.[/dim]")
            conexao.close()
            conexao.logout()
            return

        ids = msgs[0].split()
        console.print(f"[bold green]📬 Total de mensagens NÃO LIDAS encontradas:[/bold green] {len(ids)}")
        console.print("[cyan]Exibindo as 10 mensagens mais recentes:[/cyan]\n")

        tabela = Table(title="📋 Mensagens Não Lidas Mais Recentes", border_style="blue")
        tabela.add_column("ID", style="dim", width=6)
        tabela.add_column("De (Remetente)", style="magenta", width=28)
        tabela.add_column("Assunto", style="white")
        tabela.add_column("Status Filtro", justify="center", style="bold")

        for num in list(reversed(ids))[:10]:
            num_str = num.decode()
            status, hdata = conexao.fetch(num, "(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM)])")
            if status != "OK" or not hdata:
                continue

            msg_header = email.message_from_bytes(hdata[0][1])
            assunto = decodificar(msg_header.get("Subject"))
            remetente = decodificar(msg_header.get("From"))

            match = any(t in assunto.lower() for t in termos_validos)
            status_match = "[green]✅ COMPATÍVEL[/green]" if match else "[dim yellow]Ignorado[/dim yellow]"

            tabela.add_row(num_str, remetente[:26], assunto[:50], status_match)

        console.print(tabela)

        conexao.close()
        conexao.logout()

    except Exception as e:
        console.print(f"[bold red]❌ Erro durante o diagnóstico: {e}[/bold red]")


if __name__ == "__main__":
    diagnosticar()
