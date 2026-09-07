import sqlite3
from pathlib import Path

db_path = Path('rpa_email/resources/api_email_history.db')
if db_path.exists():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    print('Tables:', tables)
    for (t,) in tables:
        cur.execute(f"SELECT * FROM {t}")
        rows = cur.fetchall()
        print(f"Table {t} ({len(rows)} rows):")
        for r in rows:
            print(" ", r)
    conn.close()
