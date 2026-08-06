export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return `$${value.toFixed(decimals)}M`;
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
