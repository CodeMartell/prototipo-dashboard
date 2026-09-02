/**
 * src/utils/kpiData.js
 * Utilitarios de periodo e agregacao dos indicadores.
 *
 * Este modulo substitui o antigo data/mockData.js: nao guarda dado nenhum,
 * so transforma o que vem da API. As series mensais chegam do backend e as
 * visoes trimestral / semestral / anual sao derivadas aqui.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

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

/** Variacao percentual entre dois valores. null quando nao ha base de comparacao. */
export const calculateVariation = (current, previous) => {
  if (previous === 0 || previous === null || previous === undefined) return null;
  if (current === null || current === undefined) return null;
  return ((current - previous) / previous) * 100;
};

const isNumber = (value) => value !== null && value !== undefined && !Number.isNaN(value);

/**
 * Agrega um campo de uma lista de registros.
 * - 'sum' para valores absolutos (custo total, quantidade)
 * - 'avg' para taxas e percentuais
 * Devolve null quando nenhum registro do periodo tem valor.
 */
export const aggregateField = (rows, field, mode = 'avg') => {
  const valid = rows.filter((row) => isNumber(row?.[field]));
  if (!valid.length) return null;

  const total = valid.reduce((sum, row) => sum + row[field], 0);
  return mode === 'sum' ? total : total / valid.length;
};

/**
 * Converte a serie mensal vinda da API na visao trimestral que os
 * agrupamentos (trimestral / semestral / anual) consomem.
 *
 * `aggregate` define como somar os valores: 'sum' para absolutos, 'avg'
 * para taxas. O achievement de series somadas e recalculado a partir dos
 * totais do trimestre, em vez de virar media de percentuais.
 */
export const buildQuarterlySeries = (monthlyRows = [], { aggregate = 'avg', valueKey = 'result', lowerIsBetter = true } = {}) => {
  const groups = new Map();

  monthlyRows.forEach((row) => {
    const quarter = quarterOfMonth(row?.month);
    if (!quarter || !row?.year) return;

    const key = `${row.year}-${quarter}`;
    if (!groups.has(key)) groups.set(key, { quarter, year: row.year, rows: [] });
    groups.get(key).rows.push(row);
  });

  const series = Array.from(groups.values()).map(({ quarter, year, rows }) => {
    // O ratio do trimestre e custo total / producao total, nao a media dos
    // ratios mensais (meses de producao diferente pesariam igual).
    if (valueKey === 'ratio') {
      const logisticsCost = aggregateField(rows, 'logisticsCost', 'sum');
      const productionAmount = aggregateField(rows, 'productionAmount', 'sum');
      return {
        quarter,
        year,
        logisticsCost,
        productionAmount,
        target: null,
        achievement: null,
        ratio: isNumber(logisticsCost) && productionAmount ? logisticsCost / productionAmount : null,
      };
    }

    const value = aggregateField(rows, valueKey, aggregate);
    const target = aggregateField(rows, 'target', aggregate);

    let achievement;
    if (aggregate === 'sum') {
      // Em series somadas a media de percentuais distorce: recalcula do total.
      if (isNumber(value) && isNumber(target)) {
        const [numerator, denominator] = lowerIsBetter ? [target, value] : [value, target];
        achievement = denominator === 0 ? (numerator === 0 ? 1 : null) : numerator / denominator;
      } else {
        achievement = null;
      }
    } else {
      achievement = aggregateField(rows, 'achievement', 'avg');
    }

    return { quarter, year, target, achievement, [valueKey]: value };
  });

  return series.sort((a, b) => {
    const yearDiff = (parseInt(String(a.year).replace(/\D/g, ''), 10) || 0)
      - (parseInt(String(b.year).replace(/\D/g, ''), 10) || 0);
    if (yearDiff !== 0) return yearDiff;
    return QUARTERS.indexOf(a.quarter) - QUARTERS.indexOf(b.quarter);
  });
};
