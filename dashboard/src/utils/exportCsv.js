/**
 * src/utils/exportCsv.js
 * Utilitário para exportar dados de tabela do gráfico como CSV
 * e exportação consolidada multi-indicador da barra superior.
 */

import { formatMetricValue, getAchievementStatusClass } from './formatters.js';

const MONTHS_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
 * Escapa um valor de célula CSV (aspas duplas em torno se contiver delimitador ou aspas).
 */
export function escapeCsvCell(value, delimiter = ',') {
  const str = value == null ? '' : String(value);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converte um array de objetos em string CSV com delimitador configurável.
 */
export function toCsvString(rows, delimiter = ',') {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h], delimiter)).join(delimiter)),
  ];
  return lines.join('\r\n');
}

/**
 * Constrói as linhas consolidadas para exportação de um ou mais indicadores.
 */
export function buildConsolidatedRows({
  selectedKpis = [],
  datasets = {},
  year = 'Y26',
  scope = 'all_months',
  selectedSubPeriod = 'Jan',
  specificMonth = 'Jan',
}) {
  const rows = [];

  selectedKpis.forEach((kpi) => {
    const rawData = datasets[kpi.dataKey] || [];
    let filtered = [...rawData];

    // Filtro por ano (se for 'all', não filtra ano)
    if (year && year !== 'all') {
      filtered = filtered.filter((d) => d.year === year);
    }

    // Filtro por escopo de período
    if (scope === 'current_period') {
      filtered = filtered.filter((d) => d.month === selectedSubPeriod);
    } else if (scope === 'specific_month') {
      filtered = filtered.filter((d) => d.month === specificMonth);
    } else if (scope === 'all_months') {
      filtered = filtered.filter((d) => MONTHS_ORDER.includes(d.month));
    }

    // Ordenação cronológica por ano e mês
    filtered.sort((a, b) => {
      if (a.year !== b.year) return (a.year || '').localeCompare(b.year || '');
      const idxA = MONTHS_ORDER.indexOf(a.month);
      const idxB = MONTHS_ORDER.indexOf(b.month);
      return idxA - idxB;
    });

    filtered.forEach((d) => {
      const yearLabel = d.year && d.year.startsWith('Y') ? `20${d.year.substring(1)}` : d.year;
      const isRatio = kpi.valueKey === 'ratio' || kpi.dataKey === 'logistics_vs_prod';

      let resultFormatted = '—';
      let targetFormatted = '—';
      let achievementFormatted = '—';
      let statusLabel = '—';
      let costFormatted = '—';
      let prodFormatted = '—';
      let ratioFormatted = '—';

      if (isRatio) {
        costFormatted = d.logistics_cost != null ? String(d.logistics_cost) : '—';
        prodFormatted = d.production_amount != null ? String(d.production_amount) : '—';
        ratioFormatted = d.ratio != null ? String(d.ratio) : '—';
        resultFormatted = ratioFormatted;
      } else {
        const resultVal = d[kpi.valueKey || 'result'];
        resultFormatted = resultVal != null ? formatMetricValue(resultVal, kpi.unit) : '—';
        targetFormatted = d.target != null ? formatMetricValue(d.target, kpi.unit) : '—';

        if (d.achievement != null && !kpi.noTrafficLight) {
          const num = Number(d.achievement);
          const pct = num <= 2 && num > 0 ? num * 100 : num;
          achievementFormatted = `${pct.toFixed(2)}%`;

          const statusClass = getAchievementStatusClass(pct, kpi.lowerIsBetter, kpi.alwaysGoodStatus, {
            targetIsZero: kpi.targetIsZero,
            noTrafficLight: kpi.noTrafficLight,
            resultValue: resultVal,
          });

          if (statusClass === 'good') statusLabel = 'Meta Atingida';
          else if (statusClass === 'alert') statusLabel = 'Atenção';
          else if (statusClass === 'critical') statusLabel = 'Fora da Meta';
        }
      }

      rows.push({
        Indicador: kpi.name,
        Ano: yearLabel,
        Periodo: d.month,
        Realizado: resultFormatted,
        Meta: targetFormatted,
        Atingimento: achievementFormatted,
        Unidade: kpi.unit || '—',
        Status: statusLabel,
        Custo_Logistico: costFormatted,
        Volume_Producao: prodFormatted,
        Ratio: ratioFormatted,
      });
    });
  });

  return rows;
}

/**
 * Dispara o download de um arquivo CSV consolidado no browser.
 */
export function downloadConsolidatedCsv({
  rows = [],
  delimiter = ';',
  filename = 'relatorio_consolidado.csv',
}) {
  const csv = toCsvString(rows, delimiter);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  if (typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Dispara o download de um arquivo CSV no browser para um único KPI (gráfico individual).
 */
export function downloadKpiCsv({ data, unit, kpiName, periodLabel, currentYearLabel, prevYearLabel }) {
  const rows = buildCsvRows(data, unit, currentYearLabel, prevYearLabel);
  const csv = toCsvString(rows, ',');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  if (typeof document === 'undefined') return;

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
