"""Envia via e-mail a carga de teste normal para os KPIs vazios de Nov/Y26."""
from email.message import EmailMessage
from pathlib import Path
import os
import smtplib

import openpyxl
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "normal" / "nov_y26_kpis_vazios"
SUBJECT = "Relatorio Logistico - Teste Producao KPIs Vazios Nov Y26"


def standard_file(filename: str, sheet_name: str, target: float, result: float) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / filename
    book = openpyxl.Workbook(); sheet = book.active; sheet.title = sheet_name
    sheet.append(["month", "year", "target", "result", "achievement"])
    sheet.append(["Nov", "Y26", target, result, None])
    book.save(path)
    return path


def lvp_file() -> Path:
    path = OUTPUT / "relatorio_logistics_vs_prod.xlsx"
    book = openpyxl.Workbook(); sheet = book.active; sheet.title = "logistics_vs_prod"
    sheet.append(["month", "year", "logisticsCost", "productionAmount", "ratio"])
    sheet.append(["Nov", "Y26", 370.0, 7200.0, round(370.0 / 7200.0, 6)])
    book.save(path)
    return path


def main() -> None:
    load_dotenv(ROOT / ".env")
    user, password = os.getenv("EMAIL_USER", "").strip(), os.getenv("EMAIL_PASSWORD", "")
    if not user or not password:
        raise RuntimeError("Credenciais de e-mail não configuradas.")
    attachments = [
        standard_file("relatorio_logistic_cost.xlsx", "logistic_cost", 5.0, 4.5),
        standard_file("relatorio_total_cost.xlsx", "total_cost", 700.0, 825.0),
        standard_file("relatorio_demurrage.xlsx", "demurrage", 0.0, 0.0),
        lvp_file(),
    ]
    message = EmailMessage(); message["Subject"] = SUBJECT; message["From"] = user; message["To"] = user
    message.set_content("Teste autorizado no ambiente normal: somente KPIs vazios de Nov/Y26.")
    for path in attachments:
        message.add_attachment(path.read_bytes(), maintype="application", subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=path.name)
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
        server.starttls(); server.login(user, password); server.send_message(message)
    print("E-mail normal enviado com 4 planilhas: War Room, Task Cost, Demurrage e Logistics x Production.")


if __name__ == "__main__":
    main()
