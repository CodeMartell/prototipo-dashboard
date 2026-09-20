import { QUARTER_MONTHS, SEMESTER_MONTHS, calculateTargetAchievement } from './kpiData.js';
import { getAchievementStatusClass } from './formatters.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const number = (v) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const yearLabel = (y) => /^Y\d{2}$/.test(y) ? `20${y.slice(1)}` : String(y);

export function resolveReportScope(options) {
  if (options.scope !== 'current_period') return options;
  return { ...options, scope: (options.period || 'monthly') === 'monthly' ? 'specific_month' : options.period,
    specificMonth: options.selectedSubPeriod, specificQuarter: options.selectedSubPeriod, specificSemester: options.selectedSubPeriod };
}

function columnsFor(options) {
  const { scope = 'all_months', specificMonth = 'Jan', specificQuarter = 'Q1', specificSemester = 'H1' } = resolveReportScope(options);
  if (scope === 'specific_month') return [{ label: specificMonth, months: MONTHS.includes(specificMonth) ? [specificMonth] : [] }];
  if (scope === 'quarterly') return [{ label: specificQuarter, months: QUARTER_MONTHS[specificQuarter] || [], aggregate: true }];
  if (scope === 'semiannual') return [{ label: specificSemester, months: SEMESTER_MONTHS[specificSemester] || [], aggregate: true }];
  if (scope === 'annual') return [{ label: 'Year', months: MONTHS, aggregate: true }];
  return [...MONTHS.map((month) => ({ label: month, months: [month] })), { label: 'Year', months: MONTHS, aggregate: true }];
}

function aggregate(records, field, mode) {
  const values = records.map((r) => number(r[field])).filter((v) => v !== null);
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return mode === 'sum' ? sum : sum / values.length;
}

function valuesFor(kpi, records, isAggregate) {
  if (kpi.valueKey === 'ratio' || kpi.dataKey === 'logistics_vs_prod') {
    // Weighted ratios require matching cost/production pairs.
    const pairs = records.filter((r) => number(r.logistics_cost) !== null && number(r.production_amount) > 0);
    const cost = aggregate(pairs, 'logistics_cost', 'sum');
    const production = aggregate(pairs, 'production_amount', 'sum');
    const result = isAggregate ? (production > 0 ? cost / production : null) : number(records[0]?.ratio);
    return { result, cost, production, target: null, achievement: null, status: 'neutral' };
  }
  const result = aggregate(records, kpi.valueKey || 'result', kpi.aggregate || 'avg');
  const target = kpi.noTrafficLight ? null : aggregate(records, 'target', kpi.aggregate || 'avg');
  const pct = calculateTargetAchievement(result, target, kpi.lowerIsBetter);
  const status = result === null || target === null ? 'neutral' : getAchievementStatusClass(pct, kpi.lowerIsBetter, kpi.alwaysGoodStatus, {
    targetIsZero: target === 0, noTrafficLight: kpi.noTrafficLight, resultValue: result,
  });
  return { result, target, achievement: pct === null ? null : pct / 100, status };
}

const valueFormat = (unit) => unit === '%' || unit === 'Ratio' ? '0.00%' : unit === 'CTNR' || unit === 'KBRL' ? '#,##0' : '#,##0.00';

/** One year per sheet, one title per indicator, periods across columns. */
export function buildIndicatorReport(options = {}) {
  const columns = columnsFor(options);
  const sheets = [...new Set(options.years || [])].sort().map((year) => {
    const sections = (options.selectedKpis || []).map((kpi) => {
      const records = (options.datasets?.[kpi.dataKey] || []).filter((r) => r.year === year && MONTHS.includes(r.month));
      if (!records.some((r) => columns.some((col) => col.months.includes(r.month)))) return null;
      const values = columns.map((col) => valuesFor(kpi, records.filter((r) => col.months.includes(r.month)), col.aggregate));
      const ratio = kpi.valueKey === 'ratio' || kpi.dataKey === 'logistics_vs_prod';
      const rows = [];
      if (ratio) rows.push({ key: 'cost', label: 'Logistics cost (MUSD)', format: '#,##0.0000' }, { key: 'production', label: 'Production (MUSD)', format: '#,##0.0000' });
      if (values.some((v) => v.target !== null)) rows.push({ key: 'target', label: 'Target', format: valueFormat(kpi.unit) });
      rows.push({ key: 'result', label: ratio ? 'Ratio' : 'Result', format: valueFormat(kpi.unit) });
      if (values.some((v) => v.target !== null)) rows.push({ key: 'achievement', label: 'Achievement (%)', format: '0.00%' });
      return { kpi, values, rows };
    }).filter(Boolean);
    return { year, name: yearLabel(year), sections };
  }).filter((s) => s.sections.length);
  return { sheets, columns, sectionCount: sheets.reduce((n, s) => n + s.sections.length, 0) };
}

const fills = { good: 'E2EFDA', alert: 'FFF2CC', critical: 'FCE4D6', neutral: 'FFFFFF' };

export async function createIndicatorWorkbook(report) {
  if (!report.sheets.length) throw new Error('No data available for the selected indicators and period.');
  // Load the Excel writer only when exporting, not with the initial dashboard.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Logistics Cost Dashboard';
  workbook.calcProperties.fullCalcOnLoad = true;
  for (const sheet of report.sheets) {
    const ws = workbook.addWorksheet(sheet.name, {
      views: [{ state: 'frozen', xSplit: 1, ySplit: 3, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 } },
    });
    const width = report.columns.length + 1;
    ws.getColumn(1).width = 29;
    for (let c = 2; c <= width; c++) ws.getColumn(c).width = report.columns.length > 6 ? 12 : 20;
    ws.mergeCells(1, 1, 1, width);
    ws.getCell('A1').value = `Logistics indicators - ${sheet.name}`;
    ws.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: '17365D' } };
    ws.getRow(1).height = 32;
    ws.mergeCells(2, 1, 2, width);
    ws.getCell('A2').value = 'Blank cells: no data. Consolidated values use available months and each indicator\'s sum, average or weighted ratio.';
    ws.getCell('A2').font = { name: 'Arial', size: 9, color: { argb: '595959' } };
    ws.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
    ws.getRow(2).height = report.columns.length > 6 ? 28 : 58;
    let row = 4;
    for (const section of sheet.sections) {
      const start = row;
      ws.mergeCells(row, 1, row, width);
      const title = ws.getCell(row, 1);
      title.value = `${section.kpi.name} (${section.kpi.unit === 'Ratio' ? '%' : section.kpi.unit})`;
      title.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '17365D' } };
      title.alignment = { vertical: 'middle', wrapText: true };
      ws.getRow(row++).height = 28;
      ws.getRow(row).values = ['Item', ...report.columns.map((col) => col.label === 'Year' ? sheet.year : col.label)];
      ws.getRow(row++).height = 24;
      const rowIds = Object.fromEntries(section.rows.map((item, i) => [item.key, row + i]));
      for (const item of section.rows) {
        ws.getCell(row, 1).value = item.label;
        section.values.forEach((values, i) => {
          const cell = ws.getCell(row, i + 2);
          cell.value = values[item.key];
          cell.numFmt = item.format;
          const col = cell.address.replace(/\d+$/, '');
          if (report.columns.length > 1 && report.columns[i].aggregate && values[item.key] !== null && ['target', 'result', 'cost', 'production'].includes(item.key)) {
            if (item.key === 'result' && rowIds.cost) {
              cell.value = { formula: `${col}${rowIds.cost}/${col}${rowIds.production}`, result: values.result };
            } else {
              const mode = ['cost', 'production'].includes(item.key) || section.kpi.aggregate === 'sum' ? 'SUM' : 'AVERAGE';
              const result = values[item.key] === 0 ? '0' : values[item.key];
              cell.value = { formula: `${mode}(B${row}:${ws.getCell(row, width - 1).address})`, result };
            }
          }
          if (item.key === 'achievement' && values.achievement !== null) {
            const target = `${col}${rowIds.target}`, actual = `${col}${rowIds.result}`;
            const formula = section.kpi.lowerIsBetter
              ? `IF(${actual}=0,IF(${target}=0,1,0),${target}/${actual})`
              : `IF(${target}=0,IF(${actual}=0,1,0),${actual}/${target})`;
            cell.value = { formula, result: values.achievement };
          }
          if (item.key === 'achievement') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills[values.status] } };
        });
        ws.getRow(row++).height = 24;
      }
      for (let r = start + 1; r < row; r++) for (let c = 1; c <= width; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Arial', size: 10, bold: r === start + 1 || c === 1 || report.columns[c - 2]?.aggregate };
        cell.alignment = { horizontal: c === 1 ? 'left' : 'right', vertical: 'middle', wrapText: c === 1 };
        cell.border = { bottom: { style: 'hair', color: { argb: 'D9E1F2' } } };
        if (!cell.fill?.pattern) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r === start + 1 || report.columns[c - 2]?.aggregate ? 'D9E1F2' : c === 1 ? 'F2F2F2' : 'FFFFFF' } };
      }
      row += 2;
    }
    ws.pageSetup.printArea = `A1:${ws.getCell(row - 3, width).address}`;
    ws.pageSetup.printTitlesRow = '1:3';
    ws.headerFooter.oddFooter = '&LLogistics Cost Dashboard&RPage &P of &N';
  }
  return workbook;
}

export async function downloadIndicatorReport(report, filename) {
  const workbook = await createIndicatorWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
