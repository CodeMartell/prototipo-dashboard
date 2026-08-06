export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const KPI_CONFIG = {
  logisticCost: {
    name: 'Logistic Cost KPI TV',
    unit: '%',
    lowerIsBetter: true,
    colors: { primary: '#3b82f6', secondary: '#ef4444', target: '#10b981' }
  },
  airFreight: {
    name: 'Air Freight KPI TV',
    unit: '%',
    lowerIsBetter: true,
    colors: { primary: '#8b5cf6', secondary: '#f59e0b', target: '#10b981' }
  },
  logisticsVsProd: {
    name: 'Logistics Cost x Product Amount',
    unit: 'Ratio',
    lowerIsBetter: true,
    colors: { primary: '#ec4899', secondary: '#14b8a6' }
  }
};

export const logisticCostData = [
  // Y25
  { month: 'Jan', year: 'Y25', target: 0.0377, result: 0.0389, achievement: 0.968 },
  { month: 'Feb', year: 'Y25', target: 0.0611, result: 0.0332, achievement: 1.838 },
  { month: 'Mar', year: 'Y25', target: 0.0347, result: 0.0390, achievement: 0.889 },
  { month: 'Apr', year: 'Y25', target: 0.0620, result: 0.0660, achievement: 0.940 },
  { month: 'May', year: 'Y25', target: 0.0586, result: 0.0466, achievement: 1.256 },
  { month: 'Jun', year: 'Y25', target: 0.0616, result: 0.0349, achievement: 1.766 },
  { month: 'Jul', year: 'Y25', target: 0.0529, result: 0.0431, achievement: 1.228 },
  { month: 'Aug', year: 'Y25', target: 0.0399, result: 0.0449, achievement: 0.889 },
  { month: 'Sep', year: 'Y25', target: 0.0321, result: 0.0290, achievement: 1.108 },
  { month: 'Oct', year: 'Y25', target: 0.0510, result: 0.0310, achievement: 1.645 },
  { month: 'Nov', year: 'Y25', target: 0.0492, result: 0.0700, achievement: 0.703 },
  { month: 'Dec', year: 'Y25', target: 0.0492, result: 0.0450, achievement: 1.093 },
  // Y26
  { month: 'Jan', year: 'Y26', target: 0.0648, result: 0.0538, achievement: 1.205 },
  { month: 'Feb', year: 'Y26', target: 0.0395, result: 0.0352, achievement: 1.121 },
  { month: 'Mar', year: 'Y26', target: 0.0378, result: 0.0466, achievement: 0.811 },
  { month: 'Apr', year: 'Y26', target: 0.0409, result: 0.0410, achievement: 0.996 },
  { month: 'May', year: 'Y26', target: 0.0456, result: 0.0470, achievement: 0.970 },
  { month: 'Jun', year: 'Y26', target: 0.0504, result: null, achievement: null },
  { month: 'Jul', year: 'Y26', target: 0.0563, result: null, achievement: null },
  { month: 'Aug', year: 'Y26', target: 0.0482, result: null, achievement: null },
  { month: 'Sep', year: 'Y26', target: 0.0263, result: null, achievement: null },
  { month: 'Oct', year: 'Y26', target: 0.0314, result: null, achievement: null },
  { month: 'Nov', year: 'Y26', target: 0.0414, result: null, achievement: null },
  { month: 'Dec', year: 'Y26', target: 0.0534, result: null, achievement: null },
];

export const airFreightData = [
  // Y25
  { month: 'Jan', year: 'Y25', target: 0.004, result: 0.0012, achievement: 3.33 },
  { month: 'Feb', year: 'Y25', target: 0.004, result: 0.0023, achievement: 1.74 },
  { month: 'Mar', year: 'Y25', target: 0.004, result: 0.0038, achievement: 1.05 },
  { month: 'Apr', year: 'Y25', target: 0.004, result: 0.0010, achievement: 4.0 },
  { month: 'May', year: 'Y25', target: 0.004, result: 0.0019, achievement: 2.11 },
  { month: 'Jun', year: 'Y25', target: 0.004, result: 0.0034, achievement: 1.18 },
  { month: 'Jul', year: 'Y25', target: 0.004, result: 0.0010, achievement: 4.0 },
  { month: 'Aug', year: 'Y25', target: 0.004, result: 0.0015, achievement: 2.67 },
  { month: 'Sep', year: 'Y25', target: 0.004, result: 0.0016, achievement: 2.5 },
  { month: 'Oct', year: 'Y25', target: 0.004, result: 0.0024, achievement: 1.67 },
  { month: 'Nov', year: 'Y25', target: 0.004, result: 0.0163, achievement: 0.245 },
  { month: 'Dec', year: 'Y25', target: 0.004, result: 0.0033, achievement: 1.21 },
  // Y26
  { month: 'Jan', year: 'Y26', target: 0.0022, result: 0.0056, achievement: 0.393 },
  { month: 'Feb', year: 'Y26', target: 0.0022, result: 0.0029, achievement: 0.759 },
  { month: 'Mar', year: 'Y26', target: 0.0022, result: 0.0074, achievement: 0.297 },
  { month: 'Apr', year: 'Y26', target: 0.0022, result: 0.0035, achievement: 0.629 },
  { month: 'May', year: 'Y26', target: 0.0022, result: 0.0058, achievement: 0.379 },
  { month: 'Jun', year: 'Y26', target: 0.0022, result: 0.0066, achievement: 0.333 },
  { month: 'Jul', year: 'Y26', target: 0.0022, result: null, achievement: null },
  { month: 'Aug', year: 'Y26', target: 0.0022, result: null, achievement: null },
  { month: 'Sep', year: 'Y26', target: 0.0022, result: null, achievement: null },
  { month: 'Oct', year: 'Y26', target: 0.0022, result: null, achievement: null },
  { month: 'Nov', year: 'Y26', target: 0.0022, result: null, achievement: null },
  { month: 'Dec', year: 'Y26', target: 0.0022, result: null, achievement: null },
];

export const logisticsCostVsProdData = [
  // Y25
  { month: 'Jan', year: 'Y25', logisticsCost: 2.66, productionAmount: 49.92, ratio: 0.0534 },
  { month: 'Feb', year: 'Y25', logisticsCost: 1.91, productionAmount: 39.45, ratio: 0.0483 },
  { month: 'Mar', year: 'Y25', logisticsCost: 1.97, productionAmount: 35.93, ratio: 0.0549 },
  { month: 'Apr', year: 'Y25', logisticsCost: 2.20, productionAmount: 41.83, ratio: 0.0527 },
  { month: 'May', year: 'Y25', logisticsCost: 2.07, productionAmount: 44.43, ratio: 0.0466 },
  { month: 'Jun', year: 'Y25', logisticsCost: 1.97, productionAmount: 56.56, ratio: 0.0348 },
  { month: 'Jul', year: 'Y25', logisticsCost: 2.55, productionAmount: 59.27, ratio: 0.0430 },
  { month: 'Aug', year: 'Y25', logisticsCost: 2.33, productionAmount: 51.94, ratio: 0.0449 },
  { month: 'Sep', year: 'Y25', logisticsCost: 1.48, productionAmount: 51.38, ratio: 0.0288 },
  { month: 'Oct', year: 'Y25', logisticsCost: 1.58, productionAmount: 51.55, ratio: 0.0306 },
  { month: 'Nov', year: 'Y25', logisticsCost: 1.65, productionAmount: 23.43, ratio: 0.0704 },
  { month: 'Dec', year: 'Y25', logisticsCost: 1.36, productionAmount: 29.99, ratio: 0.0453 },
  // Y26
  { month: 'Jan', year: 'Y26', logisticsCost: 2.38, productionAmount: 47.63, ratio: 0.0500 },
  { month: 'Feb', year: 'Y26', logisticsCost: 1.61, productionAmount: 45.88, ratio: 0.0351 },
  { month: 'Mar', year: 'Y26', logisticsCost: 2.77, productionAmount: 59.51, ratio: 0.0465 },
  { month: 'Apr', year: 'Y26', logisticsCost: 2.77, productionAmount: 67.77, ratio: 0.0409 },
  { month: 'May', year: 'Y26', logisticsCost: 2.70, productionAmount: 57.15, ratio: 0.0472 },
  { month: 'Jun', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Jul', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Aug', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Sep', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Oct', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Nov', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
  { month: 'Dec', year: 'Y26', logisticsCost: null, productionAmount: null, ratio: null },
];

export const quarterlyLogisticCost = [
  { quarter: 'Q1', year: 'Y25', target: 0.0371, result: 0.0449, achievement: 1.20 },
  { quarter: 'Q2', year: 'Y25', target: 0.0607, result: 0.0492, achievement: 1.23 },
  { quarter: 'Q3', year: 'Y25', target: 0.0417, result: 0.0390, achievement: 1.07 },
  { quarter: 'Q4', year: 'Y25', target: 0.0498, result: 0.0487, achievement: 1.02 },
  { quarter: 'Q1', year: 'Y26', target: 0.0474, result: 0.0452, achievement: 1.05 },
  { quarter: 'Q2', year: 'Y26', target: 0.0456, result: 0.0440, achievement: 1.04 },
];

export const quarterlyAirFreight = [
  { quarter: 'Q1', year: 'Y25', target: 0.004, result: 0.00243, achievement: 2.04 },
  { quarter: 'Q2', year: 'Y25', target: 0.004, result: 0.0021, achievement: 2.43 },
  { quarter: 'Q3', year: 'Y25', target: 0.004, result: 0.00137, achievement: 3.06 },
  { quarter: 'Q4', year: 'Y25', target: 0.004, result: 0.00733, achievement: 1.04 },
  { quarter: 'Q1', year: 'Y26', target: 0.0022, result: 0.0053, achievement: 0.415 },
  { quarter: 'Q2', year: 'Y26', target: 0.0022, result: 0.0053, achievement: 0.415 },
];

export const quarterlyLogisticsCostVsProd = [
  { quarter: 'Q1', year: 'Y25', logisticsCost: 6.54, productionAmount: 125.31, ratio: 0.0522 },
  { quarter: 'Q2', year: 'Y25', logisticsCost: 6.25, productionAmount: 142.82, ratio: 0.0437 },
  { quarter: 'Q3', year: 'Y25', logisticsCost: 6.36, productionAmount: 162.59, ratio: 0.0391 },
  { quarter: 'Q4', year: 'Y25', logisticsCost: 4.59, productionAmount: 104.97, ratio: 0.0437 },
  { quarter: 'Q1', year: 'Y26', logisticsCost: 6.76, productionAmount: 153.02, ratio: 0.0442 },
  { quarter: 'Q2', year: 'Y26', logisticsCost: 5.47, productionAmount: 124.92, ratio: 0.0438 },
];

export const getComparisonData = (data, year, period = 'month') => {
  const currentYearData = data.filter(d => d.year === year);
  const previousYearData = data.filter(d => d.year === `Y${parseInt(year.replace('Y', '')) - 1}`);
  
  return currentYearData.map(current => {
    const previous = previousYearData.find(p => p[period] === current[period]);
    return {
      period: current[period],
      current: current.result ?? current.ratio ?? 0,
      previous: previous ? (previous.result ?? previous.ratio ?? 0) : null
    };
  });
};

export const calculateVariation = (current, previous) => {
  if (previous === 0 || !previous || current === null) return null;
  return ((current - previous) / previous) * 100;
};

export const findBestWorst = (data, field, lowerIsBetter) => {
  const validData = data.filter(d => d[field] !== null && d[field] !== undefined);
  if (validData.length === 0) return { best: null, worst: null };

  const sorted = [...validData].sort((a, b) => a[field] - b[field]);
  
  if (lowerIsBetter) {
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1]
    };
  }
  
  return {
    best: sorted[sorted.length - 1],
    worst: sorted[0]
  };
};

export const detectAnomalies = (data, field, stdDevMultiplier = 2) => {
  const validData = data.filter(d => d[field] !== null && d[field] !== undefined);
  if (validData.length === 0) return [];

  const values = validData.map(d => d[field]);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const squareDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return validData.map(d => ({
    ...d,
    isAnomaly: Math.abs(d[field] - mean) > stdDev * stdDevMultiplier
  })).filter(d => d.isAnomaly);
};
