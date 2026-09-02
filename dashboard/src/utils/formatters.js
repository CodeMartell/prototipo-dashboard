export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(decimals)}M`;
};

export const formatThousands = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(decimals)}K`;
};

/** Milhares de reais — unidade do Task Cost Reduction. */
export const formatThousandsBRL = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  const sign = value < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(value).toFixed(decimals)}K`;
};

/** Quantidade de contêineres — unidade do Demurrage. */
export const formatContainers = (value) => {
  if (value === null || value === undefined) return '-';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ctnr`;
};

/**
 * Formata um valor de acordo com a unidade do indicador.
 * Usado pelos cards de KPI e pela matriz comparativa.
 */
export const formatMetricValue = (value, unit) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (unit === '%' || unit === 'Ratio') return formatPercent(value, 2);
  if (unit === 'MUSD') return formatCurrency(value);
  if (unit === 'KUSD') return formatThousands(value);
  if (unit === 'KBRL') return formatThousandsBRL(value);
  if (unit === 'CTNR') return formatContainers(value);
  if (unit === 'achievement') return `${(value * 100).toFixed(0)}%`;
  return value;
};

export const formatVariation = (value) => {
  if (value === null || value === undefined) return '-';
  const sign = value > 0 ? '+' : '';
  const colorClass = value > 0 ? 'text-red-500' : 'text-green-500'; // Assuming lower is better mostly
  return {
    text: `${sign}${value.toFixed(1)}%`,
    colorClass
  };
};

export const getStatusColor = (achievement, lowerIsBetter = true) => {
  if (achievement === null || achievement === undefined) return 'text-gray-400';
  
  if (lowerIsBetter) {
    if (achievement >= 1.0) return 'text-green-500';
    if (achievement >= 0.9) return 'text-yellow-500';
    return 'text-red-500';
  } else {
    if (achievement >= 1.0) return 'text-green-500';
    if (achievement >= 0.9) return 'text-yellow-500';
    return 'text-red-500';
  }
};

export const getStatusIcon = (achievement, lowerIsBetter = true) => {
  if (achievement === null || achievement === undefined) return 'Minus';
  
  if (lowerIsBetter) {
    if (achievement >= 1.0) return 'CheckCircle';
    if (achievement >= 0.9) return 'AlertTriangle';
    return 'XCircle';
  } else {
    if (achievement >= 1.0) return 'CheckCircle';
    if (achievement >= 0.9) return 'AlertTriangle';
    return 'XCircle';
  }
};

export const formatMonth = (monthIndex) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '';
};

export const formatQuarter = (quarter) => {
  if (typeof quarter === 'number') return `Q${quarter}`;
  return quarter;
};
