import email
from pathlib import Path
from rpa_email.config.settings import Settings
from rpa_email.email_client import EmailClient, decode_text, _message_body, _google_drive_ids

settings = Settings.from_env()
client = EmailClient(settings.imap_host, settings.imap_port, settings.email_user, settings.email_password, settings.mailbox)
conn = client.connect()
msg = client.fetch(conn, b'686')
print('Subject:', decode_text(msg.get('Subject', '')))
print('From:', msg.get('From', ''))
print('Date:', msg.get('Date', ''))

test_dir = Path('scratch/test_email_686')
test_dir.mkdir(parents=True, exist_ok=True)
count = client.save_attachments(msg, test_dir)
print(f'Saved {count} attachments in {test_dir}:')
for p in test_dir.iterdir():
    print(f'  - {p.name} ({p.stat().st_size} bytes)')
conn.logout()
