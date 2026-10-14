"""Envia atualização Nov–Dec dos seis KPIs para a caixa monitorada pelo RPA."""
from email.message import EmailMessage
from pathlib import Path
import os
import smtplib

import openpyxl
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "homologacao" / "atualizacao_geral_nov_dez"
SUBJECT = "Relatorio Logistico - Atualizacao Geral KPIs Nov Dez"
STANDARD = {
    "logistic_cost": ("relatorio_logistic_cost.xlsx", 5.0, (4.5, 4.4)),
    "air_freight": ("relatorio_air_freight.xlsx", 0.50, (0.41, 0.39)),
    "incidental_cost": ("relatorio_incidental_cost.xlsx", 1100.0, (1221.0, 1258.0)),
    "total_cost": ("relatorio_total_cost.xlsx", 700.0, (825.0, 850.0)),
    "demurrage": ("relatorio_demurrage.xlsx", 0.0, (0.0, 0.0)),
}


def standard_file(kpi: str, name: str, target: float, results: tuple[float, float]) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / name
    book = openpyxl.Workbook(); sheet = book.active; sheet.title = kpi
    sheet.append(["month", "year", "target", "result", "achievement"])
    sheet.append(["Nov", "Y26", target, results[0], None])
    sheet.append(["Dec", "Y26", target, results[1], None])
    book.save(path)
    return path


def lvp_file() -> Path:
    path = OUTPUT / "relatorio_logistics_vs_prod.xlsx"
    book = openpyxl.Workbook(); sheet = book.active; sheet.title = "logistics_vs_prod"
    sheet.append(["month", "year", "logisticsCost", "productionAmount", "ratio"])
    for month, cost, production in (("Nov", 370.0, 7200.0), ("Dec", 375.0, 7300.0)):
        sheet.append([month, "Y26", cost, production, round(cost / production, 6)])
    book.save(path)
    return path


def main() -> None:
    load_dotenv(ROOT / ".env")
    user, password = os.getenv("EMAIL_USER", "").strip(), os.getenv("EMAIL_PASSWORD", "")
    if not user or not password:
        raise RuntimeError("Credenciais de e-mail não configuradas.")
    attachments = [standard_file(kpi, *data) for kpi, data in STANDARD.items()] + [lvp_file()]
    message = EmailMessage(); message["Subject"] = SUBJECT; message["From"] = user; message["To"] = user
    message.set_content("Homologação: atualização Nov–Dec dos seis indicadores.")
    for path in attachments:
        message.add_attachment(path.read_bytes(), maintype="application", subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=path.name)
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
        server.starttls(); server.login(user, password); server.send_message(message)
    print(f"Enviado: {len(attachments)} planilhas; assunto: {SUBJECT}")


if __name__ == "__main__":
    main()
