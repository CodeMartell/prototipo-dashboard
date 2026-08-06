import { useState, useMemo } from 'react';
import ComparisonChart from './ComparisonChart';
import DetailTable from './DetailTable';
import ActionPlanPanel from './ActionPlanPanel';
import EvidencePanel from './EvidencePanel';
import { MONTHS } from '../data/mockData';
import { Table, BarChart3 } from 'lucide-react';

const INSIGHTS = {
  logisticCost:
    'Tendência de alta no custo logístico em Mar/26. Considerar renegociação de contratos de transporte ou revisão de rotas.',
  airFreight:
    'Uso de frete aéreo consistentemente acima do target em 2026. Avaliar possibilidade de antecipação de pedidos para transporte marítimo.',
  logisticsVsProd:
    'Relação custo/produção estável em 2026 (~4.4%). Oportunidade de otimização em meses de maior produção.',
};

function buildChartData(monthlyData, quarterlyData, period, selectedYear, kpiKey) {
  const isRatioKPI = kpiKey === 'logisticsVsProd';
  const resultField = isRatioKPI ? 'ratio' : 'result';
  const prevYearStr = `Y${parseInt(selectedYear.substring(1)) - 1}`;

  if (period === 'monthly') {
    const currentData = monthlyData.filter((d) => d.year === selectedYear);
    const prevData = monthlyData.filter((d) => d.year === prevYearStr);

    return MONTHS.map((month) => {
      const cur = currentData.find((d) => d.month === month);
      const prev = prevData.find((d) => d.month === month);
      return {
        period: month,
        currentResult: cur ? cur[resultField] : null,
        previousResult: prev ? prev[resultField] : null,
        target: cur && !isRatioKPI ? cur.target : null,
        currentAchievement: cur && !isRatioKPI ? cur.achievement : null,
      };
    });
  }

  if (period === 'quarterly') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentData = quarterlyData.filter((d) => d.year === selectedYear);
    const prevData = quarterlyData.filter((d) => d.year === prevYearStr);
    return quarters.map((q) => {
      const cur = currentData.find((d) => d.quarter === q);
      const prev = prevData.find((d) => d.quarter === q);
      return {
        period: q,
        currentResult: cur ? cur[resultField] : null,
        previousResult: prev ? prev[resultField] : null,
        target: cur && !isRatioKPI ? cur.target : null,
        currentAchievement: cur && !isRatioKPI ? cur.achievement : null,
      };
    });
  }

  if (period === 'semiannual') {
    const halves = ['H1', 'H2'];
    const currentData = quarterlyData.filter((d) => d.year === selectedYear);
    const prevData = quarterlyData.filter((d) => d.year === prevYearStr);
    return halves.map((h) => {
      const qList = h === 'H1' ? ['Q1', 'Q2'] : ['Q3', 'Q4'];
      const curQs = currentData.filter((d) => qList.includes(d.quarter));
      const prevQs = prevData.filter((d) => qList.includes(d.quarter));
      const avg = (arr, field) => {
        const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
        if (!valid.length) return null;
        return valid.reduce((s, d) => s + d[field], 0) / valid.length;
      };
      return {
        period: h,
        currentResult: avg(curQs, resultField),
        previousResult: avg(prevQs, resultField),
        target: !isRatioKPI ? avg(curQs, 'target') : null,
        currentAchievement: !isRatioKPI ? avg(curQs, 'achievement') : null,
      };
    });
  }

  // annual
  const currentData = quarterlyData.filter((d) => d.year === selectedYear);
  const prevData = quarterlyData.filter((d) => d.year === prevYearStr);
  const avg = (arr, field) => {
    const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, d) => s + d[field], 0) / valid.length;
  };
  return [
    { period: selectedYear, currentResult: avg(currentData, resultField), previousResult: avg(prevData, resultField), target: !isRatioKPI ? avg(currentData, 'target') : null, currentAchievement: !isRatioKPI ? avg(currentData, 'achievement') : null },
    { period: prevYearStr, currentResult: avg(prevData, resultField), previousResult: null, target: !isRatioKPI ? avg(prevData, 'target') : null, currentAchievement: !isRatioKPI ? avg(prevData, 'achievement') : null },
  ];
}

export default function KPISection({
  kpiKey, title, icon: Icon, monthlyData, quarterlyData,
  accentColor, lowerIsBetter, unit, selectedYear, period,
}) {
  const [showTable, setShowTable] = useState(false);

  const chartData = useMemo(() => {
    const raw = buildChartData(monthlyData, quarterlyData, period, selectedYear, kpiKey);
    const withResults = raw.filter((d) => d.currentResult !== null);
    let bestPeriod = null, worstPeriod = null;
    if (withResults.length > 0) {
      const sorted = [...withResults].sort((a, b) => a.currentResult - b.currentResult);
      bestPeriod = lowerIsBetter ? sorted[0].period : sorted[sorted.length - 1].period;
      worstPeriod = lowerIsBetter ? sorted[sorted.length - 1].period : sorted[0].period;
    }
    const values = withResults.map((d) => d.currentResult);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const anomalyPeriods = withResults.filter((d) => Math.abs(d.currentResult - mean) > stdDev * 2).map((d) => d.period);
    return raw.map((d) => ({ ...d, isBest: d.period === bestPeriod, isWorst: d.period === worstPeriod, isAnomaly: anomalyPeriods.includes(d.period) }));
  }, [monthlyData, quarterlyData, period, selectedYear, kpiKey, lowerIsBetter]);

  const columns = useMemo(() => {
    const fmt = unit === '%' || unit === 'Ratio' ? 'percent' : unit === 'MUSD' ? 'currency' : 'number';
    const cols = [
      { key: 'period', label: 'Período' },
      { key: 'previousResult', label: '2025', format: fmt },
      { key: 'currentResult', label: '2026 (Realizado)', format: fmt, highlight: true },
    ];
    if (kpiKey !== 'logisticsVsProd') {
      cols.splice(2, 0, { key: 'target', label: 'Target', format: fmt });
      cols.push({ key: 'currentAchievement', label: 'Atingimento', format: 'achievement', highlight: true });
    }
    return cols;
  }, [unit, kpiKey]);

  const prevYearLabel = `20${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;

  return (
    <div className="kpi-section" id={`kpi-${kpiKey}`}>
      <div className="kpi-section__header">
        <div className="kpi-section__title">
          <div className="kpi-section__title-icon" style={{ background: accentColor }}>
            {Icon && <Icon size={16} />}
          </div>
          <h2>{title}</h2>
        </div>
        <div className="kpi-section__controls">
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {currentYearLabel} × {prevYearLabel}
          </div>
          <button className={`btn ${showTable ? 'btn--active' : ''}`} onClick={() => setShowTable(!showTable)}>
            {showTable ? <BarChart3 size={14} /> : <Table size={14} />}
            {showTable ? 'Gráfico' : 'Tabela'}
          </button>
        </div>
      </div>

      <div className="chart-panel">
        <div className="chart-panel-body">
          {!showTable ? (
            <ComparisonChart data={chartData} unit={unit} lowerIsBetter={lowerIsBetter} accentColor={accentColor} />
          ) : (
            <DetailTable
              data={chartData}
              columns={columns}
              lowerIsBetter={lowerIsBetter}
              bestPeriod={chartData.find((d) => d.isBest)?.period}
              worstPeriod={chartData.find((d) => d.isWorst)?.period}
              anomalies={chartData.filter((d) => d.isAnomaly).map((d) => d.period)}
            />
          )}
        </div>
      </div>

      <div className="kpi-section__actions">
        <ActionPlanPanel kpiName={title} period={period} insight={INSIGHTS[kpiKey]} />
        <EvidencePanel kpiName={title} />
      </div>
    </div>
  );
}
