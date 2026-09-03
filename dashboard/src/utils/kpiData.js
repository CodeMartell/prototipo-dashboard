/**
 * src/utils/kpiData.js
 * Utilitarios de periodo e agregacao dos indicadores.
 *
 * Este modulo substitui o antigo data/mockData.js: nao guarda dado nenhum,
 * so transforma o que vem da API. As series mensais chegam do backend e as
 * visoes trimestral / semestral / anual sao derivadas aqui atraves de MEDIA.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const QUARTER_MONTHS = {
  Q1: ['Jan', 'Feb', 'Mar'],
  Q2: ['Apr', 'May', 'Jun'],
  Q3: ['Jul', 'Aug', 'Sep'],
  Q4: ['Oct', 'Nov', 'Dec'],
};

export const SEMESTER_MONTHS = {
  H1: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  H2: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Trimestre de cada mes: Jan-Mar = Q1, Abr-Jun = Q2, e assim por diante. */
export const quarterOfMonth = (month) => {
  const index = MONTHS.indexOf(month);
  return index === -1 ? null : QUARTERS[Math.floor(index / 3)];
};

/** Anos presentes nos dados, em ordem crescente. Vazio quando nao ha dado. */
export const getAvailableYears = (datasets = []) => {
  const list = Array.isArray(datasets) ? datasets : Object.values(datasets);
  const years = new Set();

  list.forEach((data) => {
    if (!Array.isArray(data)) return;
    data.forEach((item) => {
      if (item?.year) years.add(item.year);
    });
  });

  return Array.from(years).sort((a, b) => {
    const numA = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
};

/** Converte valor para o número exibido na tela segundo a unidade (ex.: % vira 5.38 ao invés de 0.0538). */
export const toDisplayValue = (value, unit) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (unit === '%' || unit === 'Ratio') {
    return Number((num * 100).toFixed(2));
  }
  return Number(num.toFixed(2));
};

/** Variacao percentual entre dois valores: ((current - previous) / previous) * 100. null quando nao ha base de comparacao. */
export const calculateVariation = (current, previous) => {
  if (previous === 0 || previous === null || previous === undefined || Number.isNaN(previous)) return null;
  if (current === null || current === undefined || Number.isNaN(current)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/** Desvio absoluto entre dois valores: current - previous */
export const calculateDeviation = (current, previous) => {
  if (previous === null || previous === undefined || Number.isNaN(previous)) return null;
  if (current === null || current === undefined || Number.isNaN(current)) return null;
  return current - previous;
};

/** Atingimento da meta: (current / target) * 100 */
export const calculateTargetAchievement = (current, target) => {
  if (target === null || target === undefined || target === 0 || Number.isNaN(target)) return null;
  if (current === null || current === undefined || Number.isNaN(current)) return null;
  return (current / target) * 100;
};

const isNumber = (value) => value !== null && value !== undefined && !Number.isNaN(value);

/**
 * Agrega um campo de uma lista de registros por média aritmética.
 * Devolve null quando nenhum registro do periodo tem valor.
 */
export const aggregateField = (rows, field, mode = 'avg') => {
  const valid = rows.filter((row) => isNumber(row?.[field]));
  if (!valid.length) return null;

  const total = valid.reduce((sum, row) => sum + row[field], 0);
  return mode === 'sum' ? total : total / valid.length;
};

/** Razão ponderada do Incidental Cost: soma dos custos / soma da produção. */
export const aggregateRatio = (rows = []) => {
  const logisticsCost = aggregateField(rows, 'logisticsCost', 'sum');
  const productionAmount = aggregateField(rows, 'productionAmount', 'sum');
  return isNumber(logisticsCost) && isNumber(productionAmount) && productionAmount > 0
    ? logisticsCost / productionAmount
    : null;
};

/**
 * O War Room só informa target a partir de Y26. Nos anos anteriores o backend
 * recebe zero por compatibilidade de contrato, mas a interface deve representar
 * corretamente a ausência da meta.
 */
export const normalizeWarRoomRows = (rows = []) => rows.map((row) => {
  const year = parseInt(String(row?.year || '').replace(/\D/g, ''), 10);
  if (Number.isNaN(year) || year >= 26) return row;
  return { ...row, target: null, achievement: null };
});

/**
 * Converte a serie mensal vinda da API na visao trimestral que os
 * agrupamentos (trimestral / semestral / anual) consomem.
 * Regra: Trimestral, Semestral e Anual são agregados por MÉDIA dos meses.
 */
export const buildQuarterlySeries = (monthlyRows = [], { valueKey = 'result', lowerIsBetter = true } = {}) => {
  const groups = new Map();

  monthlyRows.forEach((row) => {
    const quarter = quarterOfMonth(row?.month);
    if (!quarter || !row?.year) return;

    const key = `${row.year}-${quarter}`;
    if (!groups.has(key)) groups.set(key, { quarter, year: row.year, rows: [] });
    groups.get(key).rows.push(row);
  });

  const series = Array.from(groups.values()).map(({ quarter, year, rows }) => {
    if (valueKey === 'ratio') {
      return {
        quarter,
        year,
        logisticsCost: aggregateField(rows, 'logisticsCost', 'sum'),
        productionAmount: aggregateField(rows, 'productionAmount', 'sum'),
        target: null,
        achievement: null,
        ratio: aggregateRatio(rows),
      };
    }

    const value = aggregateField(rows, valueKey, 'avg');
    const target = aggregateField(rows, 'target', 'avg');
    const achievement = aggregateField(rows, 'achievement', 'avg');

    return { quarter, year, target, achievement, [valueKey]: value };
  });

  return series.sort((a, b) => {
    const yearDiff = (parseInt(String(a.year).replace(/\D/g, ''), 10) || 0)
      - (parseInt(String(b.year).replace(/\D/g, ''), 10) || 0);
    if (yearDiff !== 0) return yearDiff;
    return QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter);
  });
};
