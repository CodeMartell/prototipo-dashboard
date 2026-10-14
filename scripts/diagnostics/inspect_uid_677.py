import os, imaplib, email, sys
from email.header import decode_header, make_header
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)

st, pl = c.uid('fetch', b'677', '(RFC822)')
msg = email.message_from_bytes(pl[0][1])

print("Assunto:", str(make_header(decode_header(msg.get('Subject', '')))))
print("De:", msg.get('From'))
print("Data:", msg.get('Date'))
print("Content-Type:", msg.get_content_type())

print("\nPartes do MIME:")
for idx, part in enumerate(msg.walk()):
    ct = part.get_content_type()
    cd = part.get_content_disposition()
    fn = part.get_filename()
    size = len(part.get_payload(decode=True) or b'')
    print(f"  Parte {idx}: Type={ct} | Disposition={cd} | Filename={fn} | Size={size} bytes")
    if ct == 'text/plain' or ct == 'text/html':
        text_preview = (part.get_payload(decode=True) or b'').decode('utf-8', errors='replace')[:300]
        print(f"    Texto: {text_preview!r}\n")

c.logout()
