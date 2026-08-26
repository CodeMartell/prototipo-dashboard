import imaplib, os, email
from email.header import decode_header, make_header
from dotenv import load_dotenv

load_dotenv('.env')
c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)

# 1. Busca por 'Relatorio'
st, data = c.uid('search', None, 'SUBJECT', 'Relatorio')
print('Busca SUBJECT Relatorio:', len(data[0].split() if data and data[0] else []))

# 2. Busca por 'Logistico'
st, data = c.uid('search', None, 'SUBJECT', 'Logistico')
print('Busca SUBJECT Logistico:', len(data[0].split() if data and data[0] else []))

# 3. Busca por 'Relat'
st, data = c.uid('search', None, 'SUBJECT', 'Relat')
print('Busca SUBJECT Relat:', len(data[0].split() if data and data[0] else []))

# 4. Busca por mensagens nao lidas (UNSEEN)
st, data = c.uid('search', None, 'UNSEEN')
unseen_uids = data[0].split() if data and data[0] else []
print('Mensagens UNSEEN (nao lidas):', len(unseen_uids))
for uid in unseen_uids[-5:]:
    _, pl = c.uid('fetch', uid, '(RFC822.HEADER)')
    m = email.message_from_bytes(pl[0][1])
    s = str(make_header(decode_header(m.get('Subject', ''))))
    print(f"  UNSEEN UID {uid.decode()} | De: {m.get('From')} | Assunto: {s}")

c.logout()
