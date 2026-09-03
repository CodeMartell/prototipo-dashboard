export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${(Number(value) * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const num = Number(value);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toFixed(decimals)}M`;
};

export const formatThousands = (value, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const num = Number(value);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toFixed(decimals)}K`;
};

/** Milhares de reais — unidade do Task Cost Reduction. */
export const formatThousandsBRL = (value, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const num = Number(value);
  const sign = num < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(num).toFixed(decimals)}K`;
};

/** Quantidade de contêineres — unidade do Demurrage. */
export const formatContainers = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ctnr`;
};

/**
 * Formata um valor de acordo com a unidade do indicador.
 * Usado pelos cards de KPI e pela matriz comparativa.
 */
export const formatMetricValue = (value, unit) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (unit === '%' || unit === 'Ratio') return formatPercent(value, 2);
  if (unit === 'MUSD') return formatCurrency(value, 2);
  if (unit === 'KUSD') return formatThousands(value, 2);
  if (unit === 'KBRL') return formatThousandsBRL(value, 0);
  if (unit === 'CTNR') return formatContainers(value);
  if (unit === 'achievement') return `${Number(value).toFixed(2)}%`;
  return String(value);
};

/**
 * Formata variação percentual com exatamente 2 casas decimais e sinal explícito.
 * Ex: +0.75%, -0.75%, 0.00%
 */
export const formatVariation = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const num = Number(value);
  if (Object.is(num, -0) || Math.abs(num) < 0.000001 || num.toFixed(2) === '0.00' || num.toFixed(2) === '-0.00') {
    return '0.00%';
  }
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

/**
 * Formata desvio com exatamente 2 casas decimais.
 * Para '%' ou 'Ratio', usa 'p.p.' (ex: +0.04 p.p., -0.04 p.p., 0.00 p.p.).
 * Para outras unidades, inclui o sinal e formata com a unidade correspondente.
 */
export const formatDeviation = (value, unit) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const num = Number(value);
  const isZero = Object.is(num, -0) || Math.abs(num) < 0.000001 || num.toFixed(2) === '0.00' || num.toFixed(2) === '-0.00';

  if (unit === '%' || unit === 'Ratio') {
    if (isZero) return '0.00 p.p.';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)} p.p.`;
  }

  if (isZero) {
    if (unit === 'KUSD') return '$0.00K';
    if (unit === 'MUSD') return '$0.00M';
    if (unit === 'KBRL') return 'R$ 0K';
    if (unit === 'CTNR') return '0 ctnr';
    return `0.00 ${unit || ''}`.trim();
  }

  const sign = num > 0 ? '+' : '-';
  const absVal = Math.abs(num);
  if (unit === 'KUSD') return `${sign}$${absVal.toFixed(2)}K`;
  if (unit === 'MUSD') return `${sign}$${absVal.toFixed(2)}M`;
  if (unit === 'KBRL') return `${sign}R$ ${Math.round(absVal)}K`;
  if (unit === 'CTNR') return `${sign}${absVal.toFixed(0)} ctnr`;
  return `${sign}${absVal.toFixed(2)} ${unit || ''}`.trim();
};

/**
 * Formata atingimento da meta com exatamente 2 casas decimais.
 * Ex: 83.02%
 */
export const formatTargetAchievement = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${Number(value).toFixed(2)}%`;
};

/**
 * Define a classe de cor do atingimento:
 * >= 100% -> 'good' (Verde)
 * >= 90% e < 100% -> 'alert' (Amarelo)
 * < 90% -> 'critical' (Vermelho)
 */
export const getAchievementStatusClass = (achievementPct) => {
  if (achievementPct === null || achievementPct === undefined || Number.isNaN(achievementPct)) return 'neutral';
  const num = Number(achievementPct);
  if (num >= 100) return 'good';
  if (num >= 90) return 'alert';
  return 'critical';
};

export const getStatusColor = (achievement, _lowerIsBetter = true) => {
  if (achievement === null || achievement === undefined) return 'text-gray-400';
  const num = Number(achievement);
  const pct = num <= 1 && num > 0 ? num * 100 : num;
  if (pct >= 100) return 'text-green-500';
  if (pct >= 90) return 'text-yellow-500';
  return 'text-red-500';
};

export const getStatusIcon = (achievement, _lowerIsBetter = true) => {
  if (achievement === null || achievement === undefined) return 'Minus';
  const num = Number(achievement);
  const pct = num <= 1 && num > 0 ? num * 100 : num;
  if (pct >= 100) return 'CheckCircle';
  if (pct >= 90) return 'AlertTriangle';
  return 'XCircle';
};

export const formatMonth = (monthIndex) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '';
};

export const formatQuarter = (quarter) => {
  if (typeof quarter === 'number') return `Q${quarter}`;
  return quarter;
};
