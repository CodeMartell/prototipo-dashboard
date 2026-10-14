import imaplib, os, email
from email.header import decode_header, make_header
from dotenv import load_dotenv

load_dotenv('.env')
c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))

for sent_folder in ['\"[Gmail]/Enviados\"', '\"[Gmail]/Sent Mail\"', '\"[Gmail]/Todos os e-mails\"', '\"[Gmail]/All Mail\"']:
    try:
        st, _ = c.select(sent_folder, readonly=True)
        if st == 'OK':
            st, data = c.uid('search', None, 'ALL')
            uids = data[0].split() if data and data[0] else []
            print(f"Pasta {sent_folder}: {len(uids)} mensagens")
            for uid in uids[-3:]:
                _, pl = c.uid('fetch', uid, '(RFC822.HEADER)')
                m = email.message_from_bytes(pl[0][1])
                s = str(make_header(decode_header(m.get('Subject', ''))))
                print(f"  UID {uid.decode()} | De: {m.get('From')} | Para: {m.get('To')} | Assunto: {s}")
    except Exception as e:
        print(f"Erro em {sent_folder}: {e}")

c.logout()
