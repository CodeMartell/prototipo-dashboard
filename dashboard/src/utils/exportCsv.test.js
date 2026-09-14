import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsvString, escapeCsvCell, buildConsolidatedRows } from './exportCsv.js';

test('escapeCsvCell correctly escapes cells with delimiter, quotes, or newlines', () => {
  assert.equal(escapeCsvCell('Simple'), 'Simple');
  assert.equal(escapeCsvCell('Hello, World', ','), '"Hello, World"');
  assert.equal(escapeCsvCell('Hello; World', ';'), '"Hello; World"');
  assert.equal(escapeCsvCell('He said "Hi"', ','), '"He said ""Hi"""');
  assert.equal(escapeCsvCell(null), '');
});

test('toCsvString generates correct header and row format with delimiter', () => {
  const rows = [
    { Name: 'War Room', Result: '5.38%', Target: '6.48%' },
    { Name: 'Air Freight', Result: '0.25%', Target: '0.30%' },
  ];
  const csvComma = toCsvString(rows, ',');
  assert.ok(csvComma.includes('Name,Result,Target'));
  assert.ok(csvComma.includes('War Room,5.38%,6.48%'));

  const csvSemicolon = toCsvString(rows, ';');
  assert.ok(csvSemicolon.includes('Name;Result;Target'));
  assert.ok(csvSemicolon.includes('War Room;5.38%;6.48%'));
});

test('buildConsolidatedRows filters and structures multi-indicator rows', () => {
  const kpis = [
    { key: 'logisticCost', dataKey: 'logistic_cost', name: 'War Room Report', unit: '%', lowerIsBetter: true },
    { key: 'demurrage', dataKey: 'demurrage', name: 'Demurrage Cost', unit: 'CTNR', lowerIsBetter: true, targetIsZero: true },
  ];
  const datasets = {
    logistic_cost: [
      { year: 'Y26', month: 'Jan', result: 0.0538, target: 0.0648, achievement: 1.2045 },
      { year: 'Y26', month: 'Feb', result: 0.0482, target: 0.0648, achievement: 1.3444 },
      { year: 'Y25', month: 'Jan', result: 0.0510, target: 0.0600, achievement: 1.1764 },
    ],
    demurrage: [
      { year: 'Y26', month: 'Jan', result: 0, target: 0, achievement: 1.0 },
    ],
  };

  const rows = buildConsolidatedRows({
    selectedKpis: kpis,
    datasets,
    year: 'Y26',
    scope: 'all_months',
  });

  assert.equal(rows.length, 3); // 2 from logisticCost Y26 + 1 from demurrage Y26
  assert.equal(rows[0].Indicator, 'War Room Report');
  assert.equal(rows[0].Year, '2026');
  assert.equal(rows[0].Period, 'Jan');
  assert.equal(rows[0].Achievement, '83.02%');
  assert.equal(rows[0].Status, 'Off Target');

  // Demurrage 0 should also be Target Met
  const demurrageRow = rows.find(r => r.Indicator === 'Demurrage Cost');
  assert.ok(demurrageRow);
  assert.equal(demurrageRow.Status, 'Target Met');
  assert.equal(demurrageRow.Achievement, '100.00%');
});

import { buildIndicatorReport, createIndicatorWorkbook, resolveReportScope } from './exportReport.js';

const reportKpis = [
  { key: 'totalCost', dataKey: 'total_cost', name: 'Task Cost Reduction', unit: 'KBRL', aggregate: 'sum' },
  { key: 'airFreight', dataKey: 'air_freight', name: 'Air Freight', unit: '%', aggregate: 'avg' },
  { key: 'demurrage', dataKey: 'demurrage', name: 'Demurrage Cost', unit: 'CTNR', aggregate: 'sum' },
  { key: 'resin', dataKey: 'incidental_cost', name: 'Resin Consolidation', unit: 'KUSD', aggregate: 'sum', noTrafficLight: true },
  { key: 'ratio', dataKey: 'logistics_vs_prod', valueKey: 'ratio', name: 'Incidental Cost', unit: 'Ratio', noTrafficLight: true },
];
const reportData = {
  total_cost: [
    { year: 'Y25', month: 'Jan', result: 1108, target: 1108 },
    { year: 'Y26', month: 'Jan', result: 720, target: 750 },
    { year: 'Y26', month: 'Feb', result: null, target: 750 },
    { year: 'Y26', month: 'Apr', result: 300, target: 600 },
  ],
  air_freight: [
    { year: 'Y26', month: 'Jan', result: 0.02, target: 0.04 },
    { year: 'Y26', month: 'Feb', result: 0.04, target: 0.04 },
  ],
  demurrage: [{ year: 'Y26', month: 'Jan', result: 0, target: 0 }, { year: 'Y26', month: 'Feb', result: 2, target: 0 }],
  incidental_cost: [{ year: 'Y26', month: 'Jan', result: 8.75, target: 0 }],
  logistics_vs_prod: [
    { year: 'Y26', month: 'Jan', logistics_cost: 2, production_amount: 20, ratio: 0.1 },
    { year: 'Y26', month: 'Feb', logistics_cost: 3, production_amount: 60, ratio: 0.05 },
    { year: 'Y26', month: 'Mar', logistics_cost: 500, production_amount: null, ratio: null },
  ],
};
const reportOptions = { selectedKpis: reportKpis, datasets: reportData, years: ['Y26'], scope: 'all_months' };

test('report follows the reference: periods across columns and one block per indicator', () => {
  const report = buildIndicatorReport(reportOptions);
  assert.deepEqual(report.columns.map((c) => c.label), ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Year']);
  assert.equal(report.sectionCount, 5);
  assert.deepEqual(report.sheets[0].sections[0].rows.map((r) => r.label), ['Target', 'Result', 'Achievement (%)']);
  assert.deepEqual(report.sheets[0].sections[3].rows.map((r) => r.label), ['Result']);
  assert.equal(report.sheets[0].sections[0].values[0].achievement, 0.96);
  assert.equal(report.sheets[0].sections[0].values[1].result, null);
  assert.equal(report.sheets[0].sections[2].values[0].achievement, 1);
  assert.equal(report.sheets[0].sections[2].values[1].achievement, 0);
});

test('report consolidation preserves sums, averages, weighted ratios and missing months', () => {
  const sections = buildIndicatorReport(reportOptions).sheets[0].sections;
  assert.equal(sections[0].values[12].result, 1020);
  assert.equal(sections[1].values[12].result, 0.03);
  assert.equal(sections[4].values[12].result, 5 / 80);
  assert.equal(sections[4].values[12].cost, 5);
  assert.equal(sections[4].values[2].production, null);
  assert.equal(sections[2].values[2].result, null);
});

test('report respects each explicit scope, year selection and empty selection', () => {
  for (const [scope, detail, label, expected] of [
    ['specific_month', { specificMonth: 'Apr' }, 'Apr', 300],
    ['quarterly', { specificQuarter: 'Q1' }, 'Q1', 720],
    ['semiannual', { specificSemester: 'H1' }, 'H1', 1020],
    ['annual', {}, 'Year', 1020],
  ]) {
    const report = buildIndicatorReport({ ...reportOptions, selectedKpis: [reportKpis[0]], scope, ...detail });
    assert.equal(report.columns.length, 1);
    assert.equal(report.columns[0].label, label);
    assert.equal(report.sheets[0].sections[0].values[0].result, expected);
  }
  assert.deepEqual(buildIndicatorReport({ ...reportOptions, years: ['Y26', 'Y25'] }).sheets.map((s) => s.name), ['2025', '2026']);
  assert.equal(buildIndicatorReport({ ...reportOptions, years: [] }).sectionCount, 0);
  assert.equal(buildIndicatorReport({ ...reportOptions, selectedKpis: [] }).sectionCount, 0);
  assert.equal(buildIndicatorReport({ ...reportOptions, years: ['Y24'] }).sectionCount, 0);
});

test('active dashboard quarter and semester export aggregated data rather than an empty month', () => {
  for (const [period, selectedSubPeriod, expected] of [['quarterly','Q1',720], ['semiannual','H1',1020], ['annual','Y26',1020], ['monthly','Apr',300]]) {
    const options = { ...reportOptions, scope: 'current_period', period, selectedSubPeriod };
    assert.equal(buildIndicatorReport(options).sheets[0].sections[0].values[0].result, expected);
    assert.notEqual(resolveReportScope(options).scope, 'current_period');
  }
});

test('xlsx round trip preserves numeric values, formulas, blank cells and compact headers', async () => {
  const { default: ExcelJS } = await import('exceljs');
  const book = await createIndicatorWorkbook(buildIndicatorReport(reportOptions));
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await book.xlsx.writeBuffer());
  const sheet = loaded.getWorksheet('2026');
  assert.equal(sheet.getCell('A4').value, 'Task Cost Reduction (KBRL)');
  assert.equal(sheet.getCell('B5').value, 'Jan');
  assert.equal(sheet.getCell('N5').value, 'Y26');
  assert.equal(sheet.getCell('B7').value, 720);
  assert.equal(sheet.getCell('B7').numFmt, '#,##0');
  assert.equal(sheet.getCell('C7').value, null);
  assert.equal(sheet.getCell('N7').formula, 'SUM(B7:M7)');
  assert.equal(sheet.getCell('N7').result, 1020);
  assert.equal(sheet.getCell('B8').result, 0.96);
  assert.equal(sheet.getCell('B8').numFmt, '0.00%');
  assert.equal(sheet.getCell('B14').value, 0.02);
  assert.equal(sheet.getCell('B14').numFmt, '0.00%');
  assert.ok(sheet.views[0].showGridLines === false);
  const allValues = [];sheet.eachRow((r) => r.eachCell((c) => { if (!c.isMerged || c.master.address === c.address) allValues.push(c.value); }));
  assert.equal(allValues.filter((v) => v === 'Task Cost Reduction (KBRL)').length, 1);
  assert.equal(allValues.includes('Indicator'), false);
  await assert.rejects(createIndicatorWorkbook(buildIndicatorReport({})), /No data/);
});
