"""Envia a planilha sintética Nov–Dec para a caixa monitorada pelo RPA.

O destinatário é a própria caixa configurada em .env. A planilha é criada em
outputs/homologacao e segue o contrato normalizado aceito pelo extrator.
"""

from email.message import EmailMessage
from pathlib import Path
import os
import smtplib

import openpyxl
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "homologacao" / "resina_atualizada_nov_dez.xlsx"
SUBJECT = "Relatorio Logistico - Atualizacao Resina Nov Dez"


def create_workbook() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "incidental_cost"
    sheet.append(["month", "year", "target", "result", "achievement"])
    sheet.append(["Nov", "Y26", 1100.0, 1221.0, None])
    sheet.append(["Dec", "Y26", 1100.0, 1258.0, None])
    workbook.save(OUTPUT)


def main() -> None:
    load_dotenv(ROOT / ".env")
    email_user = os.getenv("EMAIL_USER", "").strip()
    email_password = os.getenv("EMAIL_PASSWORD", "")
    if not email_user or not email_password:
        raise RuntimeError("EMAIL_USER ou EMAIL_PASSWORD não configurados.")

    create_workbook()
    message = EmailMessage()
    message["Subject"] = SUBJECT
    message["From"] = email_user
    message["To"] = email_user
    message.set_content("Teste de homologação: atualização incremental de Resina para novembro e dezembro.")
    message.add_attachment(
        OUTPUT.read_bytes(),
        maintype="application",
        subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=OUTPUT.name,
    )

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
        server.starttls()
        server.login(email_user, email_password)
        server.send_message(message)
    print(f"E-mail de teste enviado com {OUTPUT.name}. Assunto: {SUBJECT}")


if __name__ == "__main__":
    main()
