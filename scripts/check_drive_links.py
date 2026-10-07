import os, imaplib, email, sys, re, urllib.request
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)

st, pl = c.uid('fetch', b'677', '(RFC822)')
msg = email.message_from_bytes(pl[0][1])

body = ""
for part in msg.walk():
    if part.get_content_type() == 'text/plain':
        body = part.get_payload(decode=True).decode('utf-8', errors='replace')

print("Corpo do e-mail UID 677:\n", body)

# Regex para pegar nome do arquivo e link do drive
pattern = re.compile(r'([^\r\n]+)\r?\n<(https://drive\.google\.com/file/d/([a-zA-Z0-9_-]+)/[^>]+)>')
matches = pattern.findall(body)
print("\nLinks encontrados:")
for name, url, file_id in matches:
    name = name.strip()
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    print(f"  • {name} -> File ID: {file_id}")
    print(f"    Download URL: {download_url}")

c.logout()
