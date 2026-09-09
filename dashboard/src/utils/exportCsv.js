/**
 * src/utils/exportCsv.js
 * Utilitário para exportar dados de tabela do gráfico como CSV
 * e exportação consolidada multi-indicador da barra superior.
 */

import { formatMetricValue, getAchievementStatusClass } from './formatters.js';
import { QUARTER_MONTHS, SEMESTER_MONTHS, calculateTargetAchievement } from './kpiData.js';

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

const AGGREGATED_SCOPES = ['quarterly', 'semiannual', 'annual'];

function aggregateValue(items, field, mode) {
  const valid = items.filter((d) => d[field] !== null && d[field] !== undefined && !Number.isNaN(Number(d[field])));
  if (!valid.length) return null;
  const total = valid.reduce((sum, d) => sum + Number(d[field]), 0);
  return mode === 'sum' ? total : total / valid.length;
}

function buildStatusLabel(kpi, achievementPct, targetValue, resultValue) {
  const statusClass = getAchievementStatusClass(achievementPct, kpi.lowerIsBetter, kpi.alwaysGoodStatus, {
    targetIsZero: targetValue === 0,
    noTrafficLight: kpi.noTrafficLight,
    resultValue,
  });
  if (statusClass === 'good') return 'Target Met';
  if (statusClass === 'alert') return 'Attention';
  if (statusClass === 'critical') return 'Off Target';
  return '—';
}

/**
 * Constrói as linhas consolidadas para exportação de um ou mais indicadores.
 *
 * scope 'quarterly' | 'semiannual' | 'annual' geram UMA linha agregada por
 * (indicador, ano) — respeitando a regra de soma/média de CADA indicador
 * (kpi.aggregate), igual ao dashboard principal. Os demais scopes mantêm o
 * comportamento anterior: uma linha por mês, sem agregar.
 */
export function buildConsolidatedRows({
  selectedKpis = [],
  datasets = {},
  years = ['Y26'],
  scope = 'all_months',
  selectedSubPeriod = 'Jan',
  specificMonth = 'Jan',
  specificQuarter = 'Q1',
  specificSemester = 'H1',
}) {
  const rows = [];

  selectedKpis.forEach((kpi) => {
    const rawData = datasets[kpi.dataKey] || [];
    const isRatio = kpi.valueKey === 'ratio' || kpi.dataKey === 'logistics_vs_prod';

    let byYear = [...rawData];
    if (years && years.length > 0) {
      byYear = byYear.filter((d) => years.includes(d.year));
    } else {
      byYear = [];
    }

    if (AGGREGATED_SCOPES.includes(scope)) {
      years.forEach((yr) => {
        let monthsToInclude = MONTHS_ORDER;
        let periodLabel = 'Ano Completo';
        if (scope === 'quarterly') {
          monthsToInclude = QUARTER_MONTHS[specificQuarter] || [];
          periodLabel = specificQuarter;
        } else if (scope === 'semiannual') {
          monthsToInclude = SEMESTER_MONTHS[specificSemester] || [];
          periodLabel = specificSemester;
        }

        const group = byYear.filter((d) => d.year === yr && monthsToInclude.includes(d.month));
        if (group.length === 0) return;

        const yearLabel = yr.startsWith('Y') ? `20${yr.substring(1)}` : yr;
        const mode = kpi.aggregate || 'avg';

        let resultFormatted = '—';
        let targetFormatted = '—';
        let achievementFormatted = '—';
        let statusLabel = '—';
        let costFormatted = '—';
        let prodFormatted = '—';
        let ratioFormatted = '—';

        if (isRatio) {
          const costSum = aggregateValue(group, 'logistics_cost', 'sum');
          const prodSum = aggregateValue(group, 'production_amount', 'sum');
          const ratioVal = costSum != null && prodSum ? costSum / prodSum : null;
          costFormatted = costSum != null ? String(costSum) : '—';
          prodFormatted = prodSum != null ? String(prodSum) : '—';
          ratioFormatted = ratioVal != null ? String(ratioVal) : '—';
          resultFormatted = ratioFormatted;
        } else {
          const resultAgg = aggregateValue(group, kpi.valueKey || 'result', mode);
          const targetAgg = aggregateValue(group, 'target', mode);
          resultFormatted = resultAgg != null ? formatMetricValue(resultAgg, kpi.unit) : '—';
          targetFormatted = targetAgg != null ? formatMetricValue(targetAgg, kpi.unit) : '—';

          if (resultAgg != null && targetAgg != null && !kpi.noTrafficLight) {
            const pct = calculateTargetAchievement(resultAgg, targetAgg, kpi.lowerIsBetter);
            if (pct != null) {
              achievementFormatted = `${pct.toFixed(2)}%`;
              statusLabel = buildStatusLabel(kpi, pct, targetAgg, resultAgg);
            }
          }
        }

        rows.push({
          Indicator: kpi.name,
          Year: yearLabel,
          Period: periodLabel,
          Actual: resultFormatted,
          Target: targetFormatted,
          Achievement: achievementFormatted,
          Unit: kpi.unit || '—',
          Status: statusLabel,
          Logistics_Cost: costFormatted,
          Production_Volume: prodFormatted,
          Ratio: ratioFormatted,
        });
      });
      return;
    }

    // --- Scopes de linha por mês (comportamento já existente) ---
    let filtered = byYear;

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
          statusLabel = buildStatusLabel(kpi, pct, d.target, resultVal);
        }
      }

      rows.push({
        Indicator: kpi.name,
        Year: yearLabel,
        Period: d.month,
        Actual: resultFormatted,
        Target: targetFormatted,
        Achievement: achievementFormatted,
        Unit: kpi.unit || '—',
        Status: statusLabel,
        Logistics_Cost: costFormatted,
        Production_Volume: prodFormatted,
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
