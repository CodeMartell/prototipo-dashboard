import os, imaplib, sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv('.env')

c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login(os.getenv('EMAIL_USER'), os.getenv('EMAIL_PASSWORD'))
c.select('INBOX', readonly=True)

queries = [
    ["ALL"],
    ["ALL", "SUBJECT", '"Relatorio Logistico"'],
    ["SUBJECT", '"Relatorio Logistico"'],
    ["SUBJECT", 'Relatorio'],
    ["ALL", "SUBJECT", '"Relatorio Logistico"', "SINCE", "01-Jan-2026", "BEFORE", "31-Dec-2026"],
]

for q in queries:
    st, data = c.uid('search', None, *q)
    uids = [u.decode() for u in data[0].split()] if data and data[0] else []
    print(f"Query: {q} -> UIDs ({len(uids)}): {uids[-5:]}")

c.logout()
