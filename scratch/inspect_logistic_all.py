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
        for r_idx, row in enumerate(rows):
            c0 = next((cell.v for cell in row if cell.c == 0), '')
            c1 = next((cell.v for cell in row if cell.c == 1), '')
            c3 = next((cell.v for cell in row if cell.c == 3), '')
            if c0 or c1 or c3:
                # check if this row has data in U..CF
                data_cells = [(col2letter(cell.c), cell.c, round(cell.v, 4) if isinstance(cell.v, float) else cell.v) for cell in row if 20 <= cell.c <= 84 and cell.v not in (None, '')]
                c0_str = str(c0)[:25]
                c3_str = str(c3)[:20]
                print(f'Row {r_idx+1:3d} (idx {r_idx:3d}): A={c0_str:25s} | D={c3_str:20s} | data cols ({len(data_cells)}): {data_cells[:4]} ... {data_cells[-3:] if len(data_cells)>4 else []}')
