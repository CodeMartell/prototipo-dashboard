import os, imaplib, email, sys
from email.header import decode_header, make_header
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

user = os.getenv('EMAIL_USER')
pwd = os.getenv('EMAIL_PASSWORD')
host = os.getenv('IMAP_HOST', 'imap.gmail.com')

client = imaplib.IMAP4_SSL(host, 993)
client.login(user, pwd)

boxes = ['INBOX', '[Gmail]/Todos os e-mails', '[Gmail]/Spam', '[Gmail]/E-mails enviados', '[Gmail]/Lixeira']

print(f"Buscando e-mails na conta {user}...\n")

for box in boxes:
    try:
        st, _ = client.select(f'"{box}"', readonly=True)
        if st != 'OK':
            continue
        
        _, data = client.uid('search', None, 'ALL')
        uids = data[0].split() if data and data[0] else []
        print(f"📁 Pasta: {box} (Total de mensagens: {len(uids)})")
        
        # Pega os 5 mais recentes
        for uid in uids[-5:]:
            _, pl = client.uid('fetch', uid, '(RFC822)')
            msg = email.message_from_bytes(pl[0][1])
            subj = str(make_header(decode_header(msg.get('Subject', ''))))
            frm = msg.get('From', '')
            to = msg.get('To', '')
            dt = msg.get('Date', '')
            
            # Checa anexos
            attachments = []
            for part in msg.walk():
                if part.get_content_disposition() == 'attachment' or part.get_filename():
                    fn = part.get_filename()
                    if fn:
                        attachments.append(str(make_header(decode_header(fn))))
            
            print(f"   UID {uid.decode()} | {dt}")
            print(f"     De: {frm}")
            print(f"     Para: {to}")
            print(f"     Assunto: {subj}")
            print(f"     Anexos ({len(attachments)}): {attachments}\n")
    except Exception as e:
        print(f"   Erro em {box}: {e}\n")

client.logout()
