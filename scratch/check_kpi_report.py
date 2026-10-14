import openpyxl
from pathlib import Path

path = Path('kpi_reports/relatorio_logistic_cost.xlsx')
wb = openpyxl.load_workbook(path, data_only=True)
ws = wb.active
print('kpi_reports/relatorio_logistic_cost.xlsx contents:')
for r in ws.iter_rows(values_only=True):
    print(r)
