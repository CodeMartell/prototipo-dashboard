import os, smtplib, sys
from pathlib import Path
from email.message import EmailMessage
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

user = os.getenv('EMAIL_USER')
pwd = os.getenv('EMAIL_PASSWORD')

msg = EmailMessage()
msg['Subject'] = 'Relatorio Logistico'
msg['From'] = user
msg['To'] = user
msg.set_content('Segue em anexo o Relatorio Logistico.')

data_dir = Path(r'C:\Users\ROMULO_LIRA\Desktop\dados-reais')
# Testando com os arquivos que cabem no limite de 25MB do Gmail
files = [
    data_dir / "260606_ Freight Air (Monthly).xlsb",
    data_dir / "260817 '26.07 LGESP Manaus(F) War Room_v.1.1.xlsb",
    data_dir / "3-indicadores.xlsx",
]

print(f"Anexando arquivos de {data_dir}...")
for f in files:
    if not f.exists():
        print(f"ERRO: Arquivo {f} não encontrado!")
        sys.exit(1)
    
    with open(f, 'rb') as fp:
        file_data = fp.read()
        msg.add_attachment(
            file_data,
            maintype='application',
            subtype='octet-stream',
            filename=f.name
        )
    print(f"  + Anexado: {f.name} ({len(file_data) / 1024 / 1024:.2f} MB)")

print(f"\nEnviando e-mail via SMTP do Gmail para {user}...")
with smtplib.SMTP('smtp.gmail.com', 587) as server:
    server.starttls()
    server.login(user, pwd)
    server.send_message(msg)

print("✅ E-mail enviado com sucesso pelo Gmail!")
