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
  assert.equal(rows[0].Indicador, 'War Room Report');
  assert.equal(rows[0].Ano, '2026');
  assert.equal(rows[0].Periodo, 'Jan');
  assert.equal(rows[0].Atingimento, '120.45%');
  assert.equal(rows[0].Status, 'Meta Atingida');

  // Demurrage 0 should also be Meta Atingida
  const demurrageRow = rows.find(r => r.Indicador === 'Demurrage Cost');
  assert.ok(demurrageRow);
  assert.equal(demurrageRow.Status, 'Meta Atingida');
  assert.equal(demurrageRow.Atingimento, '100.00%');
});
