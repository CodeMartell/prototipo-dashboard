import os, re, sys, tempfile, urllib.request, http.cookiejar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rpa_email.app.raw_file_bridge import RawFileBridge
from rpa_email.app.ingestion_client import ApiReportSender, build_payload
from rpa_email.config.settings import Settings

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

drive_links = [
    ("'26.07 Incidental Cost_Total_v0.xlsb", "1UJPD5OjFMoD_tzYiyO04OYdjhCMa6C9K"),
    ("3-indicadores.xlsx", "1zlLSLnKsE8tyuHyHH-cX8h9KDnp46Phe"),
    ("260606_ Freight Air (Monthly).xlsb", "1BbzE0mn9JyjAuQXIJnSGMwLO32hXlZtV"),
    ("260817 '26.07 LGESP Manaus(F) War Room_v.1.1.xlsb", "1-1GMAZ-jWhfeLKYXMEKpeBQhUzg-83kQ"),
]

def download_gdrive(file_id: str, dest: Path):
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
    
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    resp = opener.open(url)
    content = resp.read()
    
    # Se retornou a página de confirmação de vírus
    confirm_token = None
    if b'confirm=' in content or b'download_warning' in content:
        html = content.decode('utf-8', errors='replace')
        # Tenta achar o confirm code no link de form ou href
        match = re.search(r'confirm=([0-9A-Za-z_-]+)', html)
        if match:
            confirm_token = match.group(1)
        else:
            match = re.search(r'name="confirm"\s+value="([^"]+)"', html)
            if match:
                confirm_token = match.group(1)
        
        if confirm_token:
            url2 = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
            resp2 = opener.open(url2)
            content = resp2.read()
    
    with open(dest, 'wb') as f:
        f.write(content)

temp_dir = Path(tempfile.mkdtemp(prefix='drive_download_'))
print(f"Baixando os 4 arquivos do Google Drive para {temp_dir}...")

for name, file_id in drive_links:
    dest = temp_dir / name
    print(f"  ⬇️ Baixando {name} (ID: {file_id})...")
    download_gdrive(file_id, dest)
    size_mb = dest.stat().st_size / 1024 / 1024
    print(f"     Tamanho baixado: {size_mb:.2f} MB")

print("\n🚀 Executando RawFileBridge na pasta dos 4 arquivos baixados...")
bridge = RawFileBridge()
extraction = bridge.process(temp_dir)
print("Erros:", extraction.errors)
print(f"Air Freight: {len(extraction.air_freight)} registros")
print(f"Incidental Cost: {len(extraction.incidental_cost)} registros")
print(f"Logistic Cost: {len(extraction.logistic_cost)} registros")
print(f"Total Cost: {len(extraction.total_cost)} registros")
print(f"Demurrage: {len(extraction.demurrage)} registros")

print("\n📡 Enviando para a API FastAPI...")
settings = Settings.from_env()
payload = build_payload(extraction, 'uid-677-google-drive-confirmed', 'Relatorio Logistico', 'romulus.lira1@gmail.com')
sender = ApiReportSender(settings.api_url, settings.api_email, settings.api_password)
status = sender.send(payload)
print(f"✅ Status da Ingestão na API: {status}")
