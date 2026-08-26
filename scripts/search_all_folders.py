import imaplib, os, email
from email.header import decode_header, make_header
from dotenv import load_dotenv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "rpa_email" / ".env")

user = os.getenv("EMAIL_USER", "")
pwd = os.getenv("EMAIL_PASSWORD", "")
host = os.getenv("IMAP_HOST", "imap.gmail.com")

client = imaplib.IMAP4_SSL(host, 993)
client.login(user, pwd)

# Listar todas as caixas postais / pastas do Gmail
status, mailboxes = client.list()
print("Mailboxes disponiveis no Gmail:")
for mb in mailboxes:
    print(" ", mb.decode())

# Buscar em [Gmail]/Todos os e-mails ou [Gmail]/Spam ou INBOX
for box in ['INBOX', '[Gmail]/Todos os e-mails', '[Gmail]/All Mail', '[Gmail]/Spam', '[Gmail]/Enviados', '[Gmail]/Sent Mail']:
    try:
        st, _ = client.select(f'\"{box}\"', readonly=True)
        if st == 'OK':
            # Busca mensagens de hoje
            st, data = client.uid('search', None, 'ALL')
            uids = data[0].split() if data and data[0] else []
            print(f"\nPasta '{box}': {len(uids)} e-mails")
            for uid in uids[-5:]:
                st, pl = client.uid('fetch', uid, '(RFC822.HEADER)')
                msg = email.message_from_bytes(pl[0][1])
                subj = str(make_header(decode_header(msg.get('Subject', ''))))
                frm = msg.get('From', '')
                dt = msg.get('Date', '')
                print(f"  UID {uid.decode()} | {dt} | De: {frm} | Assunto: {subj}")
    except Exception as e:
        pass

client.logout()
