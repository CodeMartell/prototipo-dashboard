import pyxlsb
from pathlib import Path

sample = Path('scratch/test_email_686/260817 _26.07 LGESP Manaus(F) War Room_v.1.1.xlsb')

def col2letter(col_idx):
    result = ''
    c = col_idx + 1
    while c > 0:
        c, rem = divmod(c - 1, 26)
        result = chr(65 + rem) + result
    return result

with pyxlsb.open_workbook(str(sample)) as wb:
    for sheet_name in wb.sheets:
        try:
            with wb.get_sheet(sheet_name) as sheet:
                for r_idx, row in enumerate(sheet.rows()):
                    vals = [cell.v for cell in row if cell.v not in (None, '')]
                    # Check if any value looks like 0.038, 0.061, 3.8, 6.1 or similar
                    for c_idx, cell in enumerate(row):
                        v = cell.v
                        if isinstance(v, float) and 0.037 < v < 0.039:
                            # print context
                            row_preview = [(col2letter(c.c), c.v) for c in row if c.v not in (None, '')][:8]
                            sname_ascii = str(sheet_name).encode('ascii', 'replace').decode('ascii')
                            print(f'Sheet [{sname_ascii}] Row {r_idx+1}: {row_preview}')
                            break
        except Exception:
            pass
