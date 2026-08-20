/**
 * Motor de Análise de Dados Logísticos (Analytics Engine)
 * Responsável por validar integridade (inconsistências) e tendências estatísticas (anomalias).
 */

const MONTH_ORDER = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// Ordena os registros de forma cronológica por ano (ex: Y25, Y26) e mês
export const sortChronologically = (data) => {
  return [...data].sort((a, b) => {
    const yearA = parseInt(a.year.replace('Y', ''));
    const yearB = parseInt(b.year.replace('Y', ''));
    if (yearA !== yearB) return yearA - yearB;
    return (MONTH_ORDER[a.month] ?? 0) - (MONTH_ORDER[b.month] ?? 0);
  });
};

/**
 * Calcula a média e desvio padrão de uma série de valores numéricos
 */
export const calculateStats = (values) => {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  const stdDev = Math.sqrt(avgSquareDiff);
  return { mean, stdDev };
};

/**
 * Executa a análise completa de um indicador específico
 * @param {string} kpiKey - Chave identificadora do KPI ('logisticCost', 'airFreight', 'logisticsVsProd')
 * @param {string} kpiName - Nome amigável do KPI
 * @param {Array} data - Dados históricos (lista de objetos contendo year, month, result/ratio)
 * @param {string} valueField - Nome do campo que contém o valor principal ('result' ou 'ratio')
 * @param {Object} config - Configurações de limites e limites estatísticos
 * @returns {Array} List of detected issues (alerts)
 */
export const analyzeIndicator = (kpiKey, kpiName, data, valueField, config) => {
  const alerts = [];
  const sortedData = sortChronologically(data);

  // 1. Verificar registros duplicados
  const seenKeys = new Set();
  sortedData.forEach(item => {
    const key = `${item.year}-${item.month}`;
    if (seenKeys.has(key)) {
      alerts.push({
        id: `${kpiKey}-dup-${key}-${Math.random().toString(36).substr(2, 5)}`,
        kpiKey,
        kpiName,
        year: item.year,
        type: 'inconsistency',
        subtype: 'duplicate',
        severity: 'high',
        period: `${item.month}/${item.year.replace('Y', '20')}`,
        message: `Registro duplicado encontrado para o período ${item.month}/${item.year.replace('Y', '20')}.`,
        details: `Há mais de uma entrada de dados para o mesmo período no banco de dados.`,
        item: { year: item.year, month: item.month },
        timestamp: new Date().toISOString()
      });
    }
    seenKeys.add(key);
  });

  // Extrair valores válidos para análise estatística
  const validItems = sortedData.filter(item => item[valueField] !== null && item[valueField] !== undefined && !isNaN(item[valueField]));
  const values = validItems.map(item => item[valueField]);
  const { mean, stdDev } = calculateStats(values);

  // 2. Executar verificações para cada registro
  sortedData.forEach((item, index) => {
    const val = item[valueField];
    const periodStr = `${item.month}/${item.year.replace('Y', '20')}`;

    // A. Verificar Dados Nulos/Ausentes
    if (val === null || val === undefined || isNaN(val)) {
      alerts.push({
        id: `${kpiKey}-null-${item.year}-${item.month}`,
        kpiKey,
        kpiName,
        year: item.year,
        type: 'inconsistency',
        subtype: 'missing',
        severity: 'high',
        period: periodStr,
        message: `Valor ausente (nulo) detectado no indicador ${kpiName}.`,
        details: `O registro para o período ${periodStr} não contém resultados numéricos.`,
        item: { year: item.year, month: item.month },
        timestamp: new Date().toISOString()
      });
      return; // Pula outras verificações para este item, pois o valor é nulo
    }

    // B. Verificar Valores fora do intervalo esperado (Min/Max)
    if (val < config.min || val > config.max) {
      const percentageValue = (val * 100).toFixed(2) + '%';
      const maxPercentage = (config.max * 100).toFixed(0) + '%';
      const minPercentage = (config.min * 100).toFixed(0) + '%';
      const displayVal = valueField === 'ratio' ? val.toFixed(4) : percentageValue;
      const displayMax = valueField === 'ratio' ? config.max.toFixed(2) : maxPercentage;
      const displayMin = valueField === 'ratio' ? config.min.toFixed(2) : minPercentage;

      alerts.push({
        id: `${kpiKey}-range-${item.year}-${item.month}`,
        kpiKey,
        kpiName,
        year: item.year,
        type: 'inconsistency',
        subtype: 'out_of_bounds',
        severity: 'high',
        period: periodStr,
        message: `Valor fora do limite esperado: ${displayVal}.`,
        details: `O valor registrado de ${displayVal} excede a faixa operacional de segurança estabelecida ([${displayMin}, ${displayMax}]).`,
        item: { year: item.year, month: item.month, value: val },
        timestamp: new Date().toISOString()
      });
    }

    // C. Verificar conflito de cálculo (Apenas para KPI de Ratio)
    if (kpiKey === 'logisticsVsProd' && item.logisticsCost !== undefined && item.productionAmount !== undefined) {
      const expectedRatio = item.productionAmount > 0 ? (item.logisticsCost / item.productionAmount) : 0;
      if (Math.abs(val - expectedRatio) > 0.002) {
        alerts.push({
          id: `${kpiKey}-conflict-${item.year}-${item.month}`,
          kpiKey,
          kpiName,
          year: item.year,
          type: 'inconsistency',
          subtype: 'conflict',
          severity: 'high',
          period: periodStr,
          message: `Conflito matemático encontrado no cálculo de Ratio.`,
          details: `O ratio informado (${val.toFixed(4)}) diverge do cálculo teórico (Custo ${item.logisticsCost} / Produção ${item.productionAmount} = ${expectedRatio.toFixed(4)}).`,
          item: { year: item.year, month: item.month, value: val, expected: expectedRatio },
          timestamp: new Date().toISOString()
        });
      }
    }

    // D. Verificar oscilação anômala por Z-Score (Desvio Padrão)
    if (stdDev > 0) {
      const zScore = (val - mean) / stdDev;
      if (Math.abs(zScore) > config.zScoreThreshold) {
        const displayVal = valueField === 'ratio' ? val.toFixed(4) : (val * 100).toFixed(2) + '%';
        alerts.push({
          id: `${kpiKey}-zscore-${item.year}-${item.month}`,
          kpiKey,
          kpiName,
          year: item.year,
          type: 'anomaly',
          subtype: 'zscore',
          severity: Math.abs(zScore) > (config.zScoreThreshold + 1) ? 'high' : 'medium',
          period: periodStr,
          message: `Pico/queda estatisticamente anômala detectada (Z-Score: ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)}).`,
          details: `O valor de ${displayVal} representa um desvio extremo em relação ao padrão histórico médio do indicador.`,
          item: { year: item.year, month: item.month, value: val, zScore },
          timestamp: new Date().toISOString()
        });
      }
    }

    // E. Verificar oscilação anômala por variação abrupta MoM (Month-on-Month)
    if (index > 0) {
      const prevItem = sortedData[index - 1];
      const prevVal = prevItem[valueField];
      
      if (prevVal !== null && prevVal !== undefined && !isNaN(prevVal) && prevVal > 0) {
        const variation = ((val - prevVal) / prevVal) * 100;
        
        if (Math.abs(variation) > config.momThreshold) {
          const displayVal = valueField === 'ratio' ? val.toFixed(4) : (val * 100).toFixed(2) + '%';
          const displayPrev = valueField === 'ratio' ? prevVal.toFixed(4) : (prevVal * 100).toFixed(2) + '%';
          const direction = variation > 0 ? 'aumento' : 'queda';

          alerts.push({
            id: `${kpiKey}-mom-${item.year}-${item.month}`,
            kpiKey,
            kpiName,
            year: item.year,
            type: 'anomaly',
            subtype: 'mom_variation',
            severity: Math.abs(variation) > (config.momThreshold * 1.5) ? 'high' : 'medium',
            period: periodStr,
            message: `Oscilação abrupta em relação ao mês anterior (${variation > 0 ? '+' : ''}${variation.toFixed(1)}%).`,
            details: `Identificada uma ${direction} brusca de ${displayPrev} para ${displayVal} comparado com ${prevItem.month}/${prevItem.year.replace('Y', '20')}.`,
            item: { year: item.year, month: item.month, value: val, prevValue: prevVal, variation },
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  });

  return alerts;
};

/**
 * Roda a análise consolidada de todos os indicadores do dashboard
 * @param {Object} datasets - Objeto com os três arrays de dados { logisticCost, airFreight, logisticsVsProd }
 * @param {Object} configs - Configurações de análise para cada indicador
 */
export const runFullAnalysis = (datasets, configs) => {
  const logisticCostAlerts = analyzeIndicator(
    'logisticCost',
    'Logistic Cost KPI TV',
    datasets.logisticCost || [],
    'result',
    configs.logisticCost
  );

  const airFreightAlerts = analyzeIndicator(
    'airFreight',
    'Air Freight KPI TV',
    datasets.airFreight || [],
    'result',
    configs.airFreight
  );

  const logisticsVsProdAlerts = analyzeIndicator(
    'logisticsVsProd',
    'Logistic Cost x Product Amount',
    datasets.logisticsVsProd || [],
    'ratio',
    configs.logisticsVsProd
  );

  return [
    ...logisticCostAlerts,
    ...airFreightAlerts,
    ...logisticsVsProdAlerts
  ];
};

/**
 * Calcula métricas agregadas de integridade e anomalias para um ano específico ou base total
 */
export const calculateYearlyStats = (datasets, alerts = [], targetYear = 'all') => {
  const isAll = targetYear === 'all';
  
  // Contagem de registros do ano
  let recordCount = 0;
  const countInArray = (arr) => {
    if (!Array.isArray(arr)) return 0;
    return isAll ? arr.length : arr.filter(d => d.year === targetYear).length;
  };

  recordCount += countInArray(datasets.logisticCost);
  recordCount += countInArray(datasets.airFreight);
  recordCount += countInArray(datasets.logisticsVsProd);

  // Filtragem de alertas do ano
  const yearAlerts = isAll
    ? alerts
    : alerts.filter(a => a.year === targetYear || a.period?.includes(targetYear.replace('Y', '20')));

  const inconsistencyCount = yearAlerts.filter(a => a.type === 'inconsistency').length;
  const anomalyCount = yearAlerts.filter(a => a.type === 'anomaly').length;
  const highCount = yearAlerts.filter(a => a.severity === 'high').length;
  const mediumCount = yearAlerts.filter(a => a.severity === 'medium').length;

  const integrityScore = recordCount > 0
    ? Math.max(0, 100 - (inconsistencyCount / recordCount) * 100)
    : 100;

  return {
    recordCount,
    yearAlerts,
    inconsistencyCount,
    anomalyCount,
    highCount,
    mediumCount,
    integrityScore
  };
};

/**
 * Retorna as configurações padrão do motor de análise
 */
export const getDefaultConfigs = () => ({
  logisticCost: {
    min: 0.0,
    max: 0.08, // Máximo aceitável de 8.0%
    zScoreThreshold: 2.0, // 2 desvios padrões
    momThreshold: 45.0, // Variação MoM limite de 45%
  },
  airFreight: {
    min: 0.0,
    max: 0.01, // Máximo aceitável de 1.0% para o frete aéreo padrão (target é 0.4%)
    zScoreThreshold: 2.0,
    momThreshold: 50.0, // Variação MoM limite de 50%
  },
  logisticsVsProd: {
    min: 0.0,
    max: 0.075, // Ratio máximo aceitável de 0.075
    zScoreThreshold: 2.0,
    momThreshold: 40.0, // Variação MoM limite de 40%
  }
});
