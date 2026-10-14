import imaplib, os, email
from email.header import decode_header, make_header
from dotenv import load_dotenv

load_dotenv('.env')
c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)

# Busca sem filtro de data ou assunto, apenas pelo remetente
st, data = c.uid('search', None, 'FROM', '"romulo.lira@ufam.edu.br"')
uids = data[0].split() if data and data[0] else []
print(f"Emails encontrados de romulo.lira@ufam.edu.br: {len(uids)}")
for uid in uids:
    _, pl = c.uid('fetch', uid, '(RFC822.HEADER)')
    m = email.message_from_bytes(pl[0][1])
    s = str(make_header(decode_header(m.get('Subject', ''))))
    print(f"  UID {uid.decode()} | Date: {m.get('Date')} | Assunto: {s} | From: {m.get('From')}")

c.logout()
