import email
from rpa_email.config.settings import Settings
from rpa_email.email_client import EmailClient, decode_text

settings = Settings.from_env()
client = EmailClient(settings.imap_host, settings.imap_port, settings.email_user, settings.email_password, settings.mailbox)
conn = client.connect()
criteria = ["SUBJECT", '"Relatorio Logistico"']
uids = client.search(conn, criteria)
print('Found UIDs by client.search:', [u.decode() for u in uids])
for u in uids:
    msg = client.fetch(conn, u)
    subj = decode_text(msg.get('Subject', ''))
    frm = msg.get('From', '')
    dt = msg.get('Date', '')
    print(f'UID {u.decode()}: Subject: {subj} | From: {frm} | Date: {dt}')
conn.logout()
