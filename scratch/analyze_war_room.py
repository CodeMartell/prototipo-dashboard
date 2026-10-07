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
    sheet_names = [str(s).encode('ascii', 'replace').decode('ascii') for s in wb.sheets]
    print('Sheets in workbook:', sheet_names)
    with wb.get_sheet('Logistic') as sheet:
        rows = list(sheet.rows())
        print('Total rows:', len(rows))
        
        # Check row 68 (index 67)
        r68 = rows[67]
        print('\n--- Row 68 (index 67) ---')
        for cell in r68:
            if cell.v not in (None, ''):
                print(f'  {col2letter(cell.c):4s} (c={cell.c:3d}): {cell.v}')
                
        # Check all other rows that have 'TV' or 'Logistic'
        print('\n--- All rows with TV in column A/D ---')
        for r_idx, r in enumerate(rows):
            c0 = next((cell.v for cell in r if cell.c == 0), None)
            c3 = next((cell.v for cell in r if cell.c == 3), None)
            if c0 == 'TV' or c3 == 'TV' or (c0 and 'TV' in str(c0)):
                print(f'Row {r_idx+1:3d} (idx {r_idx:3d}): col0={c0} | col3={c3}')
