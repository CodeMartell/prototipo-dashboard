import imaplib, os, email
from email.header import decode_header, make_header
from dotenv import load_dotenv

load_dotenv('.env')
c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)
st, data = c.uid('search', None, 'ALL')
uids = data[0].split()
print('Total INBOX:', len(uids))
for uid in uids[-5:]:
    _, pl = c.uid('fetch', uid, '(RFC822.HEADER)')
    m = email.message_from_bytes(pl[0][1])
    s = str(make_header(decode_header(m.get('Subject', ''))))
    print(f"UID {uid.decode()} | Date: {m.get('Date')} | De: {m.get('From')} | Assunto: {s}")
c.logout()
