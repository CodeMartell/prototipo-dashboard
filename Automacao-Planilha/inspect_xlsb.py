from pathlib import Path
from pyxlsb import open_workbook

SOURCE = Path(r"C:\Users\ROMULO_LIRA\Desktop\dados-reais")


def col_name(index: int) -> str:
    result = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result


def print_row(row):
    parts = [f"{col_name(c.c)}={c.v!r}" for c in row if c.v not in (None, "")]
    if parts:
        print(f"    Excel row {row[0].r + 1}: " + " | ".join(parts))


for path in sorted(SOURCE.glob("*.xlsb")):
    if path.name.startswith("~$"):
        continue
    if "Freight Air" in path.name:
        mode = "freight"
    elif "War Room" in path.name:
        mode = "war"
    elif "Incidental Cost" in path.name:
        continue
    else:
        continue
    print(f"\nFILE: {path.name}")
    with open_workbook(str(path)) as wb:
        print("SHEETS:", wb.sheets)
        for sheet_name in wb.sheets:
            selected = []
            with wb.get_sheet(sheet_name) as sheet:
                for row in sheet.rows():
                    vals = [c.v for c in row]
                    text = " | ".join("" if v is None else str(v) for v in vals).lower()
                    if mode == "freight":
                        keep = False
                    elif mode == "war":
                        keep = sheet_name == "Logistic" and row[0].r + 1 in (6, 7, 8, 68)
                    else:
                        keep = sheet_name.startswith("Incidental Cost") and 76 <= row[0].r + 1 <= 100
                    if keep:
                        selected.append(row)
            if selected:
                print(f"  SHEET {sheet_name!r}")
                for row in selected[:120]:
                    if mode == "incidental":
                        row = [c for c in row if c.c < 8 or 20 <= c.c <= 44]
                    elif mode == "war":
                        row = [c for c in row if c.c < 10 or c.c >= 59]
                    print_row(row)
