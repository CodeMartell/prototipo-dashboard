import imaplib, os, email, sys
from email.header import decode_header, make_header
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))

_, mailboxes = c.list()
print("Verificando pastas:")
for mb in mailboxes:
    box_str = mb.decode()
    box_name = box_str.split(' "/" ')[-1].strip('"')
    try:
        st, _ = c.select(f'"{box_name}"', readonly=True)
        if st == 'OK':
            _, data = c.uid('search', None, 'ALL')
            uids = data[0].split() if data and data[0] else []
            print(f"\n📂 Pasta: '{box_name}' ({len(uids)} msgs)")
            for uid in uids[-3:]:
                _, pl = c.uid('fetch', uid, '(RFC822.HEADER)')
                m = email.message_from_bytes(pl[0][1])
                s = str(make_header(decode_header(m.get('Subject', ''))))
                print(f"   UID {uid.decode()} | Date: {m.get('Date')} | De: {m.get('From')} | Assunto: {s}")
    except Exception as e:
        print(f"Erro ao acessar {box_name}: {e}")

c.logout()
