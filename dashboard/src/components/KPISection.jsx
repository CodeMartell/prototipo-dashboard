import { useState, useMemo, useEffect } from 'react';
import ComparisonChart from './ComparisonChart';
import DetailTable from './DetailTable';
import ActionPlanPanel from './ActionPlanPanel';
import EvidencePanel from './EvidencePanel';
import { MONTHS, aggregateRatio } from '../utils/kpiData';
import { Table, BarChart3, PencilLine } from 'lucide-react';

function buildChartData(monthlyData, quarterlyData, period, selectedYear, kpiKey) {
  const isRatioKPI = kpiKey === 'logisticsVsProd';
  const resultField = isRatioKPI ? 'ratio' : 'result';
  const prevYearStr = `Y${parseInt(selectedYear.substring(1)) - 1}`;

  const avg = (arr, field) => {
    const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, d) => s + d[field], 0) / valid.length;
  };

  const currentData = monthlyData.filter((d) => d.year === selectedYear);
  const prevData = monthlyData.filter((d) => d.year === prevYearStr);
  const resultValue = (rows) => isRatioKPI ? aggregateRatio(rows) : avg(rows, resultField);

  if (period === 'monthly') {
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
    const quarters = [
      { q: 'Q1', months: ['Jan', 'Feb', 'Mar'] },
      { q: 'Q2', months: ['Apr', 'May', 'Jun'] },
      { q: 'Q3', months: ['Jul', 'Aug', 'Sep'] },
      { q: 'Q4', months: ['Oct', 'Nov', 'Dec'] },
    ];

    return quarters.map(({ q, months }) => {
      const curMonths = currentData.filter((d) => months.includes(d.month));
      const prevMonths = prevData.filter((d) => months.includes(d.month));
      return {
        period: q,
        currentResult: resultValue(curMonths),
        previousResult: resultValue(prevMonths),
        target: !isRatioKPI ? avg(curMonths, 'target') : null,
        currentAchievement: !isRatioKPI ? avg(curMonths, 'achievement') : null,
      };
    });
  }

  if (period === 'semiannual') {
    const halves = [
      { h: 'H1', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
      { h: 'H2', months: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
    ];

    return halves.map(({ h, months }) => {
      const curMonths = currentData.filter((d) => months.includes(d.month));
      const prevMonths = prevData.filter((d) => months.includes(d.month));
      return {
        period: h,
        currentResult: resultValue(curMonths),
        previousResult: resultValue(prevMonths),
        target: !isRatioKPI ? avg(curMonths, 'target') : null,
        currentAchievement: !isRatioKPI ? avg(curMonths, 'achievement') : null,
      };
    });
  }

  // annual
  return [
    {
      period: selectedYear,
      currentResult: resultValue(currentData),
      previousResult: resultValue(prevData),
      target: !isRatioKPI ? avg(currentData, 'target') : null,
      currentAchievement: !isRatioKPI ? avg(currentData, 'achievement') : null,
    },
    {
      period: prevYearStr,
      currentResult: resultValue(prevData),
      previousResult: null,
      target: !isRatioKPI ? avg(prevData, 'target') : null,
      currentAchievement: !isRatioKPI ? avg(prevData, 'achievement') : null,
    },
  ];
}

export default function KPISection({
  kpiKey, title, icon: Icon, monthlyData, quarterlyData,
  accentColor, lowerIsBetter, unit, selectedYear, period, activePeriodLabel,
  onEditData,
}) {
  const [showTable, setShowTable] = useState(false);
  const [localSelectedPeriod, setLocalSelectedPeriod] = useState(null);

  // Sync or reset local selection when the global active period label or grouping period type changes
  useEffect(() => {
    setLocalSelectedPeriod(null);
  }, [activePeriodLabel, period]);

  const activePeriod = localSelectedPeriod || activePeriodLabel;

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

  const prevYearLabel = `20${(parseInt(selectedYear.replace(/\D/g, ''), 10) || 26) - 1}`;
  const currentYearLabel = `20${selectedYear.replace(/\D/g, '') || '26'}`;

  const columns = useMemo(() => {
    // 'metric' delega a formatação para a unidade do indicador.
    const cols = [
      { key: 'period', label: 'Period' },
      { key: 'previousResult', label: prevYearLabel, format: 'metric', unit },
      { key: 'currentResult', label: `${currentYearLabel} (Actual)`, format: 'metric', unit, highlight: true },
    ];
    if (kpiKey !== 'logisticsVsProd') {
      cols.splice(2, 0, { key: 'target', label: 'Target', format: 'metric', unit });
      cols.push({ key: 'currentAchievement', label: 'Achievement', format: 'achievement', highlight: true });
    }
    return cols;
  }, [unit, kpiKey, prevYearLabel, currentYearLabel]);

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
            {showTable ? 'Chart' : 'Table'}
          </button>
          {onEditData && (
            <button
              className="btn btn--primary"
              onClick={() => onEditData(activePeriod)}
              title="Enter or correct this indicator's values for a month"
            >
              <PencilLine size={14} />
              Enter values
            </button>
          )}
        </div>
      </div>

      <div className="chart-panel">
        <div className="chart-panel-body">
          {!showTable ? (
            <ComparisonChart
              data={chartData}
              unit={unit}
              lowerIsBetter={lowerIsBetter}
              accentColor={accentColor}
              selectedPeriod={activePeriod}
              onPeriodClick={setLocalSelectedPeriod}
              currentYearLabel={currentYearLabel}
              prevYearLabel={prevYearLabel}
            />
          ) : (
            <DetailTable
              data={chartData}
              columns={columns}
              lowerIsBetter={lowerIsBetter}
              bestPeriod={chartData.find((d) => d.isBest)?.period}
              worstPeriod={chartData.find((d) => d.isWorst)?.period}
              anomalies={chartData.filter((d) => d.isAnomaly).map((d) => d.period)}
              selectedPeriod={activePeriod}
              onPeriodClick={setLocalSelectedPeriod}
            />
          )}
        </div>
      </div>

      {/* Dynamic Focus Period Header */}
      <div className="kpi-section__period-focus">
        <div className="kpi-section__period-focus-badge" style={{ borderLeft: `3px solid ${accentColor}` }}>
          Focused Period: <strong>{activePeriod} / {selectedYear.substring(1)}</strong>
        </div>
        <div className="kpi-section__period-focus-hint">
          {localSelectedPeriod ? (
            <button className="kpi-section__period-reset-btn" onClick={() => setLocalSelectedPeriod(null)}>
              Reset to global default ({activePeriodLabel})
            </button>
          ) : (
            <span>Click on a chart column or table row to select another month</span>
          )}
        </div>
      </div>

      <div className="kpi-section__actions">
        <ActionPlanPanel
          kpiKey={kpiKey}
          kpiName={title}
          period={period}
          selectedYear={selectedYear}
          periodLabel={activePeriod}
        />
        <EvidencePanel
          kpiKey={kpiKey}
          kpiName={title}
          selectedYear={selectedYear}
          periodLabel={activePeriod}
        />
      </div>
    </div>
  );
}
