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
    with wb.get_sheet('Logistic') as sheet:
        rows = list(sheet.rows())
        for r_idx in range(10):
            row = rows[r_idx]
            for cell in row:
                if cell.v and ('24' in str(cell.v) or '25' in str(cell.v) or '26' in str(cell.v)):
                    print(f'Header Row {r_idx+1} Col {col2letter(cell.c)} (c={cell.c}): {cell.v}')
