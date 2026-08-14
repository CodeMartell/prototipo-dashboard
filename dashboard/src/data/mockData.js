export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const KPI_CONFIG = {
  logisticCost: {
    name: 'War Room',
    unit: '%',
    lowerIsBetter: true,
    colors: { primary: '#3b82f6', secondary: '#60a5fa', target: '#f59e0b' }
  },
  incidentialCost: {
    name: 'Incidential Cost',
    unit: '%',
    lowerIsBetter: true,
    colors: { primary: '#2563eb', secondary: '#93c5fd', target: '#f59e0b' }
  },
  totalCost: {
    name: 'Total Cost',
    unit: 'MUSD',
    lowerIsBetter: true,
    colors: { primary: '#1d4ed8', secondary: '#60a5fa', target: '#f59e0b' }
  },
  demurrage: {
    name: 'Demurrage',
    unit: 'KUSD',
    lowerIsBetter: true,
    colors: { primary: '#0ea5e9', secondary: '#7dd3fc', target: '#f59e0b' }
  },
  airFreight: {
    name: 'Air Freight',
    unit: '%',
    lowerIsBetter: true,
    colors: { primary: '#38bdf8', secondary: '#bae6fd', target: '#f59e0b' }
  },
  logisticsVsProd: {
    name: 'Logistics Cost x Product Amount',
    unit: 'Ratio',
    lowerIsBetter: true,
    colors: { primary: '#0284c7', secondary: '#7dd3fc' }
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
  { month: 'Jun', year: 'Y26', target: 0.0504, result: 0.0428, achievement: 1.177 },
  { month: 'Jul', year: 'Y26', target: 0.0563, result: 0.0495, achievement: 1.137 },
  { month: 'Aug', year: 'Y26', target: 0.0482, result: 0.0451, achievement: 1.068 },
  { month: 'Sep', year: 'Y26', target: 0.0263, result: 0.0275, achievement: 0.956 },
  { month: 'Oct', year: 'Y26', target: 0.0314, result: 0.0302, achievement: 1.039 },
  { month: 'Nov', year: 'Y26', target: 0.0414, result: 0.0480, achievement: 0.862 },
  { month: 'Dec', year: 'Y26', target: 0.0534, result: 0.0462, achievement: 1.155 },
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
  { month: 'Jun', year: 'Y26', target: 0.0022, result: 0.0028, achievement: 0.785 },
  { month: 'Jul', year: 'Y26', target: 0.0022, result: 0.0021, achievement: 1.047 },
  { month: 'Aug', year: 'Y26', target: 0.0022, result: 0.0018, achievement: 1.222 },
  { month: 'Sep', year: 'Y26', target: 0.0022, result: 0.0020, achievement: 1.100 },
  { month: 'Oct', year: 'Y26', target: 0.0022, result: 0.0024, achievement: 0.916 },
  { month: 'Nov', year: 'Y26', target: 0.0022, result: 0.0041, achievement: 0.536 },
  { month: 'Dec', year: 'Y26', target: 0.0022, result: 0.0025, achievement: 0.880 },
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
  { month: 'Jun', year: 'Y26', logisticsCost: 2.45, productionAmount: 57.24, ratio: 0.0428 },
  { month: 'Jul', year: 'Y26', logisticsCost: 3.02, productionAmount: 61.01, ratio: 0.0495 },
  { month: 'Aug', year: 'Y26', logisticsCost: 2.58, productionAmount: 57.20, ratio: 0.0451 },
  { month: 'Sep', year: 'Y26', logisticsCost: 1.46, productionAmount: 53.09, ratio: 0.0275 },
  { month: 'Oct', year: 'Y26', logisticsCost: 1.60, productionAmount: 52.98, ratio: 0.0302 },
  { month: 'Nov', year: 'Y26', logisticsCost: 1.30, productionAmount: 27.08, ratio: 0.0480 },
  { month: 'Dec', year: 'Y26', logisticsCost: 1.48, productionAmount: 32.03, ratio: 0.0462 },
];

/* Incidential Cost — custos incidentais (avarias, reentregas, retrabalho) como % do faturamento */
export const incidentialCostData = [
  // Y25
  { month: 'Jan', year: 'Y25', target: 0.0080, result: 0.0092, achievement: 0.870 },
  { month: 'Feb', year: 'Y25', target: 0.0080, result: 0.0071, achievement: 1.127 },
  { month: 'Mar', year: 'Y25', target: 0.0080, result: 0.0085, achievement: 0.941 },
  { month: 'Apr', year: 'Y25', target: 0.0080, result: 0.0104, achievement: 0.769 },
  { month: 'May', year: 'Y25', target: 0.0080, result: 0.0078, achievement: 1.026 },
  { month: 'Jun', year: 'Y25', target: 0.0080, result: 0.0065, achievement: 1.231 },
  { month: 'Jul', year: 'Y25', target: 0.0080, result: 0.0088, achievement: 0.909 },
  { month: 'Aug', year: 'Y25', target: 0.0080, result: 0.0074, achievement: 1.081 },
  { month: 'Sep', year: 'Y25', target: 0.0080, result: 0.0059, achievement: 1.356 },
  { month: 'Oct', year: 'Y25', target: 0.0080, result: 0.0062, achievement: 1.290 },
  { month: 'Nov', year: 'Y25', target: 0.0080, result: 0.0115, achievement: 0.696 },
  { month: 'Dec', year: 'Y25', target: 0.0080, result: 0.0083, achievement: 0.964 },
  // Y26
  { month: 'Jan', year: 'Y26', target: 0.0065, result: 0.0072, achievement: 0.903 },
  { month: 'Feb', year: 'Y26', target: 0.0065, result: 0.0058, achievement: 1.121 },
  { month: 'Mar', year: 'Y26', target: 0.0065, result: 0.0081, achievement: 0.802 },
  { month: 'Apr', year: 'Y26', target: 0.0065, result: 0.0069, achievement: 0.942 },
  { month: 'May', year: 'Y26', target: 0.0065, result: 0.0063, achievement: 1.032 },
  { month: 'Jun', year: 'Y26', target: 0.0065, result: 0.0055, achievement: 1.182 },
  { month: 'Jul', year: 'Y26', target: 0.0065, result: 0.0074, achievement: 0.878 },
  { month: 'Aug', year: 'Y26', target: 0.0065, result: 0.0061, achievement: 1.066 },
  { month: 'Sep', year: 'Y26', target: 0.0065, result: 0.0048, achievement: 1.354 },
  { month: 'Oct', year: 'Y26', target: 0.0065, result: 0.0052, achievement: 1.250 },
  { month: 'Nov', year: 'Y26', target: 0.0065, result: 0.0070, achievement: 0.929 },
  { month: 'Dec', year: 'Y26', target: 0.0065, result: 0.0066, achievement: 0.985 },
];

/* Total Cost — custo logístico total em MUSD (valores absolutos, somados nos agrupamentos) */
export const totalCostData = [
  // Y25
  { month: 'Jan', year: 'Y25', target: 2.70, result: 2.66, achievement: 1.015 },
  { month: 'Feb', year: 'Y25', target: 2.00, result: 1.91, achievement: 1.047 },
  { month: 'Mar', year: 'Y25', target: 2.05, result: 1.97, achievement: 1.041 },
  { month: 'Apr', year: 'Y25', target: 2.10, result: 2.20, achievement: 0.955 },
  { month: 'May', year: 'Y25', target: 2.15, result: 2.07, achievement: 1.039 },
  { month: 'Jun', year: 'Y25', target: 2.05, result: 1.97, achievement: 1.041 },
  { month: 'Jul', year: 'Y25', target: 2.40, result: 2.55, achievement: 0.941 },
  { month: 'Aug', year: 'Y25', target: 2.40, result: 2.33, achievement: 1.030 },
  { month: 'Sep', year: 'Y25', target: 1.60, result: 1.48, achievement: 1.081 },
  { month: 'Oct', year: 'Y25', target: 1.65, result: 1.58, achievement: 1.044 },
  { month: 'Nov', year: 'Y25', target: 1.50, result: 1.65, achievement: 0.909 },
  { month: 'Dec', year: 'Y25', target: 1.40, result: 1.36, achievement: 1.029 },
  // Y26
  { month: 'Jan', year: 'Y26', target: 2.45, result: 2.38, achievement: 1.029 },
  { month: 'Feb', year: 'Y26', target: 1.70, result: 1.61, achievement: 1.056 },
  { month: 'Mar', year: 'Y26', target: 2.60, result: 2.77, achievement: 0.939 },
  { month: 'Apr', year: 'Y26', target: 2.80, result: 2.77, achievement: 1.011 },
  { month: 'May', year: 'Y26', target: 2.60, result: 2.70, achievement: 0.963 },
  { month: 'Jun', year: 'Y26', target: 2.50, result: 2.45, achievement: 1.020 },
  { month: 'Jul', year: 'Y26', target: 2.90, result: 3.02, achievement: 0.960 },
  { month: 'Aug', year: 'Y26', target: 2.65, result: 2.58, achievement: 1.027 },
  { month: 'Sep', year: 'Y26', target: 1.55, result: 1.46, achievement: 1.062 },
  { month: 'Oct', year: 'Y26', target: 1.65, result: 1.60, achievement: 1.031 },
  { month: 'Nov', year: 'Y26', target: 1.35, result: 1.30, achievement: 1.038 },
  { month: 'Dec', year: 'Y26', target: 1.55, result: 1.48, achievement: 1.047 },
];

/* Demurrage — sobrestadia de contêineres em KUSD (valores absolutos, somados nos agrupamentos) */
export const demurrageData = [
  // Y25
  { month: 'Jan', year: 'Y25', target: 50, result: 62, achievement: 0.806 },
  { month: 'Feb', year: 'Y25', target: 50, result: 41, achievement: 1.220 },
  { month: 'Mar', year: 'Y25', target: 50, result: 55, achievement: 0.909 },
  { month: 'Apr', year: 'Y25', target: 50, result: 71, achievement: 0.704 },
  { month: 'May', year: 'Y25', target: 50, result: 48, achievement: 1.042 },
  { month: 'Jun', year: 'Y25', target: 50, result: 36, achievement: 1.389 },
  { month: 'Jul', year: 'Y25', target: 50, result: 58, achievement: 0.862 },
  { month: 'Aug', year: 'Y25', target: 50, result: 44, achievement: 1.136 },
  { month: 'Sep', year: 'Y25', target: 50, result: 29, achievement: 1.724 },
  { month: 'Oct', year: 'Y25', target: 50, result: 33, achievement: 1.515 },
  { month: 'Nov', year: 'Y25', target: 50, result: 86, achievement: 0.581 },
  { month: 'Dec', year: 'Y25', target: 50, result: 52, achievement: 0.962 },
  // Y26
  { month: 'Jan', year: 'Y26', target: 40, result: 47, achievement: 0.851 },
  { month: 'Feb', year: 'Y26', target: 40, result: 32, achievement: 1.250 },
  { month: 'Mar', year: 'Y26', target: 40, result: 51, achievement: 0.784 },
  { month: 'Apr', year: 'Y26', target: 40, result: 43, achievement: 0.930 },
  { month: 'May', year: 'Y26', target: 40, result: 38, achievement: 1.053 },
  { month: 'Jun', year: 'Y26', target: 40, result: 29, achievement: 1.379 },
  { month: 'Jul', year: 'Y26', target: 40, result: 49, achievement: 0.816 },
  { month: 'Aug', year: 'Y26', target: 40, result: 36, achievement: 1.111 },
  { month: 'Sep', year: 'Y26', target: 40, result: 24, achievement: 1.667 },
  { month: 'Oct', year: 'Y26', target: 40, result: 27, achievement: 1.481 },
  { month: 'Nov', year: 'Y26', target: 40, result: 44, achievement: 0.909 },
  { month: 'Dec', year: 'Y26', target: 40, result: 35, achievement: 1.143 },
];

export const quarterlyIncidentialCost = [
  { quarter: 'Q1', year: 'Y25', target: 0.0080, result: 0.00827, achievement: 0.967 },
  { quarter: 'Q2', year: 'Y25', target: 0.0080, result: 0.00823, achievement: 0.972 },
  { quarter: 'Q3', year: 'Y25', target: 0.0080, result: 0.00737, achievement: 1.086 },
  { quarter: 'Q4', year: 'Y25', target: 0.0080, result: 0.00867, achievement: 0.923 },
  { quarter: 'Q1', year: 'Y26', target: 0.0065, result: 0.00703, achievement: 0.924 },
  { quarter: 'Q2', year: 'Y26', target: 0.0065, result: 0.00623, achievement: 1.043 },
  { quarter: 'Q3', year: 'Y26', target: 0.0065, result: 0.00610, achievement: 1.066 },
  { quarter: 'Q4', year: 'Y26', target: 0.0065, result: 0.00627, achievement: 1.037 },
];

export const quarterlyTotalCost = [
  { quarter: 'Q1', year: 'Y25', target: 6.75, result: 6.54, achievement: 1.032 },
  { quarter: 'Q2', year: 'Y25', target: 6.30, result: 6.24, achievement: 1.010 },
  { quarter: 'Q3', year: 'Y25', target: 6.40, result: 6.36, achievement: 1.006 },
  { quarter: 'Q4', year: 'Y25', target: 4.55, result: 4.59, achievement: 0.991 },
  { quarter: 'Q1', year: 'Y26', target: 6.75, result: 6.76, achievement: 0.999 },
  { quarter: 'Q2', year: 'Y26', target: 7.90, result: 7.92, achievement: 0.997 },
  { quarter: 'Q3', year: 'Y26', target: 7.10, result: 7.06, achievement: 1.006 },
  { quarter: 'Q4', year: 'Y26', target: 4.55, result: 4.38, achievement: 1.039 },
];

export const quarterlyDemurrage = [
  { quarter: 'Q1', year: 'Y25', target: 150, result: 158, achievement: 0.949 },
  { quarter: 'Q2', year: 'Y25', target: 150, result: 155, achievement: 0.968 },
  { quarter: 'Q3', year: 'Y25', target: 150, result: 131, achievement: 1.145 },
  { quarter: 'Q4', year: 'Y25', target: 150, result: 171, achievement: 0.877 },
  { quarter: 'Q1', year: 'Y26', target: 120, result: 130, achievement: 0.923 },
  { quarter: 'Q2', year: 'Y26', target: 120, result: 110, achievement: 1.091 },
  { quarter: 'Q3', year: 'Y26', target: 120, result: 109, achievement: 1.101 },
  { quarter: 'Q4', year: 'Y26', target: 120, result: 106, achievement: 1.132 },
];

export const quarterlyLogisticCost = [
  { quarter: 'Q1', year: 'Y25', target: 0.0371, result: 0.0449, achievement: 1.20 },
  { quarter: 'Q2', year: 'Y25', target: 0.0607, result: 0.0492, achievement: 1.23 },
  { quarter: 'Q3', year: 'Y25', target: 0.0417, result: 0.0390, achievement: 1.07 },
  { quarter: 'Q4', year: 'Y25', target: 0.0498, result: 0.0487, achievement: 1.02 },
  { quarter: 'Q1', year: 'Y26', target: 0.0474, result: 0.0452, achievement: 1.05 },
  { quarter: 'Q2', year: 'Y26', target: 0.0456, result: 0.0436, achievement: 1.04 },
  { quarter: 'Q3', year: 'Y26', target: 0.0436, result: 0.0407, achievement: 1.07 },
  { quarter: 'Q4', year: 'Y26', target: 0.0421, result: 0.0415, achievement: 1.01 },
];

export const quarterlyAirFreight = [
  { quarter: 'Q1', year: 'Y25', target: 0.004, result: 0.00243, achievement: 2.04 },
  { quarter: 'Q2', year: 'Y25', target: 0.004, result: 0.0021, achievement: 2.43 },
  { quarter: 'Q3', year: 'Y25', target: 0.004, result: 0.00137, achievement: 3.06 },
  { quarter: 'Q4', year: 'Y25', target: 0.004, result: 0.00733, achievement: 1.04 },
  { quarter: 'Q1', year: 'Y26', target: 0.0022, result: 0.0053, achievement: 0.415 },
  { quarter: 'Q2', year: 'Y26', target: 0.0022, result: 0.0040, achievement: 0.550 },
  { quarter: 'Q3', year: 'Y26', target: 0.0022, result: 0.0020, achievement: 1.100 },
  { quarter: 'Q4', year: 'Y26', target: 0.0022, result: 0.0030, achievement: 0.733 },
];

export const quarterlyLogisticsCostVsProd = [
  { quarter: 'Q1', year: 'Y25', logisticsCost: 6.54, productionAmount: 125.31, ratio: 0.0522 },
  { quarter: 'Q2', year: 'Y25', logisticsCost: 6.25, productionAmount: 142.82, ratio: 0.0437 },
  { quarter: 'Q3', year: 'Y25', logisticsCost: 6.36, productionAmount: 162.59, ratio: 0.0391 },
  { quarter: 'Q4', year: 'Y25', logisticsCost: 4.59, productionAmount: 104.97, ratio: 0.0437 },
  { quarter: 'Q1', year: 'Y26', logisticsCost: 6.76, productionAmount: 153.02, ratio: 0.0442 },
  { quarter: 'Q2', year: 'Y26', logisticsCost: 6.92, productionAmount: 182.16, ratio: 0.0380 },
  { quarter: 'Q3', year: 'Y26', logisticsCost: 7.06, productionAmount: 171.30, ratio: 0.0412 },
  { quarter: 'Q4', year: 'Y26', logisticsCost: 4.38, productionAmount: 112.09, ratio: 0.0391 },
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
