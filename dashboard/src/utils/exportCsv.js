/**
 * src/utils/exportCsv.js
 * Utilitário para exportar dados de tabela do gráfico como CSV.
 */

import { formatMetricValue } from './formatters';

/**
 * Converte uma linha de dados do gráfico em objeto legível.
 * @param {object} row  - linha do chartData (period, currentResult, previousResult, target, currentAchievement)
 * @param {string} unit - unidade do KPI (ex: '%', 'KUSD', 'CTNR')
 * @param {string} currentYearLabel - ex: '2026'
 * @param {string} prevYearLabel    - ex: '2025'
 */
function buildCsvRows(data, unit, currentYearLabel, prevYearLabel) {
  return data.map((row) => {
    const achievement = row.currentAchievement != null
      ? `${(row.currentAchievement * 100).toFixed(2)}%`
      : '—';

    return {
      Period: row.period,
      [`Actual (${currentYearLabel})`]: row.currentResult != null ? formatMetricValue(row.currentResult, unit) : '—',
      [`Previous (${prevYearLabel})`]: row.previousResult != null ? formatMetricValue(row.previousResult, unit) : '—',
      Target: row.target != null ? formatMetricValue(row.target, unit) : '—',
      Achievement: achievement,
    };
  });
}

/**
 * Escapa um valor de célula CSV (aspas duplas em torno se contiver vírgula ou aspas).
 */
function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converte um array de objetos em string CSV.
 */
function toCsvString(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

/**
 * Dispara o download de um arquivo CSV no browser.
 * @param {object[]} data            - chartData filtrado (período selecionado ou completo)
 * @param {string}   unit            - unidade do KPI
 * @param {string}   kpiName         - nome do indicador (usado no nome do arquivo)
 * @param {string}   periodLabel     - período atual (ex: 'Jan/26', 'Q1/26', '2026')
 * @param {string}   currentYearLabel - ex: '2026'
 * @param {string}   prevYearLabel    - ex: '2025'
 */
export function downloadKpiCsv({ data, unit, kpiName, periodLabel, currentYearLabel, prevYearLabel }) {
  const rows = buildCsvRows(data, unit, currentYearLabel, prevYearLabel);
  const csv = toCsvString(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  const safeName = kpiName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safePeriod = (periodLabel || 'all').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `kpi_${safeName}_${safePeriod}_${currentYearLabel}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
