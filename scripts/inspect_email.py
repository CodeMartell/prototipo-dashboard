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
port = int(os.getenv("IMAP_PORT", "993"))

print(f"Conectando ao IMAP ({user} @ {host})...")
client = imaplib.IMAP4_SSL(host, port)
client.login(user, pwd)
client.select("INBOX", readonly=True)

status, data = client.uid("search", None, "ALL")
uids = data[0].split() if data and data[0] else []
print(f"Total de e-mails na INBOX: {len(uids)}")

for uid in uids[-10:]:
    st, pl = client.uid("fetch", uid, "(RFC822)")
    msg = email.message_from_bytes(pl[0][1])
    subj = str(make_header(decode_header(msg.get("Subject", ""))))
    frm = msg.get("From", "")
    dt = msg.get("Date", "")
    attachments = [part.get_filename() for part in msg.walk() if part.get_content_disposition() == "attachment"]
    print(f"UID {uid.decode()} | Assunto: '{subj}' | De: '{frm}' | Anexos: {attachments}")

client.logout()
