import { useState, useMemo, useEffect } from 'react';
import ComparisonChart from './ComparisonChart';
import DetailTable from './DetailTable';
import ActionPlanPanel from './ActionPlanPanel';
import EvidencePanel from './EvidencePanel';
import { MONTHS, QUARTER_MONTHS, SEMESTER_MONTHS, aggregateRatio } from '../utils/kpiData';
import { Table, BarChart3, PencilLine, Download, RotateCcw } from 'lucide-react';
import { downloadKpiCsv } from '../utils/exportCsv';

const PERIOD_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Semiannual',
  annual: 'Annual',
};

const MONTH_OPTIONS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUARTER_OPTIONS = ['Q1','Q2','Q3','Q4'];
const SEMESTER_OPTIONS = ['H1','H2'];

/** Retorna os sub-períodos disponíveis para um dado tipo de período */
function subOptionsFor(periodType, yearOptions) {
  if (periodType === 'monthly')    return MONTH_OPTIONS;
  if (periodType === 'quarterly')  return QUARTER_OPTIONS;
  if (periodType === 'semiannual') return SEMESTER_OPTIONS;
  return yearOptions; // annual
}

/** Primeiro sub-período padrão ao mudar de tipo */
function defaultSubFor(periodType, selectedYear) {
  if (periodType === 'monthly')    return 'Jan';
  if (periodType === 'quarterly')  return 'Q1';
  if (periodType === 'semiannual') return 'H1';
  return selectedYear;
}

function buildChartData(monthlyData, period, selectedYear, yearOptions, kpiKey) {
  const isRatioKPI = kpiKey === 'logisticsVsProd';
  const hasTargetData = !isRatioKPI && kpiKey !== 'incidentialCost';
  const resultField = isRatioKPI ? 'ratio' : 'result';
  const prevYearStr = `Y${parseInt(selectedYear.substring(1)) - 1}`;

  const avg = (arr, field) => {
    const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, d) => s + d[field], 0) / valid.length;
  };

  const sum = (arr, field) => {
    const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    return valid.reduce((s, d) => s + d[field], 0);
  };

  // Demurrage usa soma acumulada
  const aggregateFn = kpiKey === 'demurrage' ? sum : avg;

  const currentData = monthlyData.filter((d) => d.year === selectedYear);
  const prevData    = monthlyData.filter((d) => d.year === prevYearStr);
  const resultValue = (rows) => isRatioKPI ? aggregateRatio(rows) : aggregateFn(rows, resultField);

  // Detecta se os dados são apenas de granularidade anual (ex: AIR Freight Y24/Y25)
  const isAnnualOnly = currentData.length > 0 && currentData.every((d) => d.month === 'Annual');
  const isPrevAnnualOnly = prevData.length > 0 && prevData.every((d) => d.month === 'Annual');

  if (period === 'monthly') {
    if (isAnnualOnly) {
      // Apenas um ponto "Annual" disponível
      return [{
        period: 'Annual',
        currentResult: currentData[0]?.[resultField] ?? null,
        previousResult: isPrevAnnualOnly ? prevData[0]?.[resultField] ?? null : null,
        target: hasTargetData ? currentData[0]?.target ?? null : null,
        currentAchievement: hasTargetData ? currentData[0]?.achievement ?? null : null,
        annualOnly: true,
      }];
    }
    return MONTHS.map((month) => {
      const cur  = currentData.find((d) => d.month === month);
      const prev = prevData.find((d) => d.month === month);
      return {
        period: month,
        currentResult:      cur ? cur[resultField] : null,
        previousResult:     prev ? prev[resultField] : null,
        target:             cur && hasTargetData ? cur.target : null,
        currentAchievement: cur && hasTargetData ? cur.achievement : null,
      };
    });
  }

  if (period === 'quarterly') {
    const quarters = [
      { q: 'Q1', months: ['Jan','Feb','Mar'] },
      { q: 'Q2', months: ['Apr','May','Jun'] },
      { q: 'Q3', months: ['Jul','Aug','Sep'] },
      { q: 'Q4', months: ['Oct','Nov','Dec'] },
    ];
    return quarters.map(({ q, months }) => {
      const curMonths  = currentData.filter((d) => months.includes(d.month));
      const prevMonths = prevData.filter((d) => months.includes(d.month));
      return {
        period: q,
        currentResult:      resultValue(curMonths),
        previousResult:     resultValue(prevMonths),
        target:             hasTargetData ? avg(curMonths, 'target') : null,
        currentAchievement: hasTargetData ? avg(curMonths, 'achievement') : null,
      };
    });
  }

  if (period === 'semiannual') {
    const halves = [
      { h: 'H1', months: ['Jan','Feb','Mar','Apr','May','Jun'] },
      { h: 'H2', months: ['Jul','Aug','Sep','Oct','Nov','Dec'] },
    ];
    return halves.map(({ h, months }) => {
      const curMonths  = currentData.filter((d) => months.includes(d.month));
      const prevMonths = prevData.filter((d) => months.includes(d.month));
      return {
        period: h,
        currentResult:      resultValue(curMonths),
        previousResult:     resultValue(prevMonths),
        target:             hasTargetData ? avg(curMonths, 'target') : null,
        currentAchievement: hasTargetData ? avg(curMonths, 'achievement') : null,
      };
    });
  }

  // annual
  const allYears = Array.from(new Set([selectedYear, prevYearStr, ...(yearOptions || [])]));
  return allYears
    .filter((yr) => monthlyData.some((d) => d.year === yr))
    .sort()
    .map((yr) => {
      const yrData = monthlyData.filter((d) => d.year === yr);
      return {
        period: `20${yr.substring(1)}`,
        currentResult:      resultValue(yrData),
        previousResult:     null,
        target:             hasTargetData ? avg(yrData, 'target') : null,
        currentAchievement: hasTargetData ? avg(yrData, 'achievement') : null,
      };
    });
}

/** Filtra chartData para o sub-período selecionado (para export e foco) */
function filterBySubPeriod(chartData, subPeriod, periodType) {
  if (!subPeriod || periodType === 'annual') return chartData;
  const found = chartData.find((d) => d.period === subPeriod);
  return found ? [found] : chartData;
}

export default function KPISection({
  kpiKey, title, icon: Icon, monthlyData, quarterlyData,
  accentColor, lowerIsBetter, unit, selectedYear, period, activePeriodLabel,
  onEditData,
}) {
  const [showTable, setShowTable] = useState(false);

  // Período local — permite mudar tipo e sub dentro da seção sem afetar o topo
  const [localPeriod,    setLocalPeriod]    = useState(null); // null = usa global
  const [localSubPeriod, setLocalSubPeriod] = useState(null);
  const [localYear,      setLocalYear]      = useState(null);

  // Obter lista de anos disponíveis nos dados
  const availableYears = useMemo(() => {
    const ys = new Set((monthlyData || []).map((d) => d.year).filter(Boolean));
    return Array.from(ys).sort();
  }, [monthlyData]);

  // Sincroniza ao receber novas props globais (se local não estiver "travado")
  useEffect(() => {
    setLocalPeriod(null);
    setLocalSubPeriod(null);
    setLocalYear(null);
  }, [activePeriodLabel, period, selectedYear]);

  // Resolve período efetivo
  const effectivePeriod    = localPeriod    ?? period;
  const effectiveYear      = localYear      ?? selectedYear;
  const effectiveSubPeriod = localSubPeriod ?? activePeriodLabel;

  const hasLocalOverride = localPeriod !== null || localSubPeriod !== null || localYear !== null;

  const handleLocalPeriodChange = (newPeriod) => {
    setLocalPeriod(newPeriod);
    setLocalSubPeriod(defaultSubFor(newPeriod, effectiveYear));
  };

  const handleResetLocal = () => {
    setLocalPeriod(null);
    setLocalSubPeriod(null);
    setLocalYear(null);
  };

  const chartData = useMemo(() => {
    const raw = buildChartData(monthlyData, effectivePeriod, effectiveYear, availableYears, kpiKey);
    const withResults = raw.filter((d) => d.currentResult !== null);
    let bestPeriod = null, worstPeriod = null;
    if (withResults.length > 0) {
      const sorted = [...withResults].sort((a, b) => a.currentResult - b.currentResult);
      bestPeriod  = lowerIsBetter ? sorted[0].period : sorted[sorted.length - 1].period;
      worstPeriod = lowerIsBetter ? sorted[sorted.length - 1].period : sorted[0].period;
    }
    const values   = withResults.map((d) => d.currentResult);
    const mean     = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev   = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
    const anomalyPeriods = withResults
      .filter((d) => Math.abs(d.currentResult - mean) > stdDev * 2)
      .map((d) => d.period);
    return raw.map((d) => ({
      ...d,
      isBest:    d.period === bestPeriod,
      isWorst:   d.period === worstPeriod,
      isAnomaly: anomalyPeriods.includes(d.period),
    }));
  }, [monthlyData, effectivePeriod, effectiveYear, availableYears, kpiKey, lowerIsBetter]);

  // Detecta se os dados desse ano são apenas de granularidade anual (AIR Freight Y24/Y25)
  const isAnnualOnlyData = useMemo(() => {
    const yearRows = (monthlyData || []).filter((d) => d.year === effectiveYear);
    return yearRows.length > 0 && yearRows.every((d) => d.month === 'Annual');
  }, [monthlyData, effectiveYear]);

  const prevYearLabel    = `20${(parseInt(effectiveYear.replace(/\D/g, ''), 10) || 26) - 1}`;
  const currentYearLabel = `20${effectiveYear.replace(/\D/g, '') || '26'}`;

  // Período selecionado no gráfico por clique
  const [clickedPeriod, setClickedPeriod] = useState(null);
  useEffect(() => { setClickedPeriod(null); }, [effectivePeriod, effectiveYear]);

  const activePeriod = clickedPeriod ?? effectiveSubPeriod;

  const columns = useMemo(() => {
    const cols = [
      { key: 'period',         label: 'Period' },
      { key: 'previousResult', label: prevYearLabel,           format: 'metric', unit },
      { key: 'currentResult',  label: `${currentYearLabel} (Actual)`, format: 'metric', unit, highlight: true },
    ];
    if (kpiKey !== 'logisticsVsProd' && kpiKey !== 'incidentialCost') {
      cols.splice(2, 0, { key: 'target',            label: 'Target',      format: 'metric',      unit });
      cols.push(       { key: 'currentAchievement', label: 'Achievement', format: 'achievement', highlight: true });
    }
    return cols;
  }, [unit, kpiKey, prevYearLabel, currentYearLabel]);

  // Dados para export: se há um sub-período clicado, exporta só aquele; senão tudo
  const exportData = useMemo(() => {
    if (clickedPeriod) {
      return filterBySubPeriod(chartData, clickedPeriod, effectivePeriod);
    }
    return chartData.filter((d) => d.currentResult !== null || d.previousResult !== null);
  }, [chartData, clickedPeriod, effectivePeriod]);

  const handleExport = () => {
    const periodLabel = clickedPeriod
      ? `${clickedPeriod}_${currentYearLabel}`
      : `${effectivePeriod}_${currentYearLabel}`;
    downloadKpiCsv({
      data: exportData,
      unit,
      kpiName: title,
      periodLabel,
      currentYearLabel,
      prevYearLabel,
    });
  };

  // Sub-período options para o mini seletor
  const subOptions = useMemo(() => {
    if (effectivePeriod === 'annual') return availableYears;
    return subOptionsFor(effectivePeriod, availableYears);
  }, [effectivePeriod, availableYears]);

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

      {/* Aviso para anos de granularidade anual apenas (AIR Freight Y24/Y25) */}
      {isAnnualOnlyData && (
        <div className="kpi-section__annual-only-notice">
          <span>
            ⚠️ Data for <strong>{currentYearLabel}</strong> is available as an <strong>annual cumulative total only</strong> — no monthly breakdown exists for this year.
          </span>
        </div>
      )}

      <div className="chart-panel">
        {/* Mini seletor de período inline — independente do filtro do topo */}
        <div className="chart-panel__inline-filter">
          <div className="chart-panel__inline-filter-left">
            <span className="chart-panel__inline-filter-label">View as:</span>
            <div className="chart-panel__period-pills">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`chart-period-pill ${effectivePeriod === key ? 'active' : ''}`}
                  onClick={() => handleLocalPeriodChange(key)}
                  disabled={isAnnualOnlyData && key !== 'annual' && key !== 'monthly'}
                  title={isAnnualOnlyData && key !== 'annual' && key !== 'monthly' ? 'Annual-only data' : undefined}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Seletor de ano local */}
            {availableYears.length > 1 && (
              <div className="chart-panel__year-select-wrap">
                <label className="chart-panel__inline-filter-label" htmlFor={`year-select-${kpiKey}`}>Year:</label>
                <select
                  id={`year-select-${kpiKey}`}
                  className="year-select year-select--sm"
                  value={effectiveYear}
                  onChange={(e) => {
                    const yr = e.target.value;
                    setLocalYear(yr);
                    setLocalSubPeriod(defaultSubFor(effectivePeriod, yr));
                  }}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      20{yr.substring(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sub-período quando não é anual */}
            {effectivePeriod !== 'annual' && !isAnnualOnlyData && (
              <div className="chart-panel__sub-pills">
                {subOptions.map((opt) => (
                  <button
                    key={opt}
                    className={`chart-subperiod-pill ${effectiveSubPeriod === opt ? 'active' : ''}`}
                    onClick={() => {
                      setLocalSubPeriod(opt);
                      setClickedPeriod(null);
                    }}
                  >
                    {typeof opt === 'string' && opt.startsWith('Y') ? `20${opt.substring(1)}` : opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botões direita: Reset + Export */}
          <div className="chart-panel__inline-filter-right">
            {hasLocalOverride && (
              <button
                className="btn btn--sm chart-reset-btn"
                onClick={handleResetLocal}
                title={`Reset to global period (${activePeriodLabel})`}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
            <button
              className="btn btn--sm btn--export"
              onClick={handleExport}
              title={`Export ${clickedPeriod ? clickedPeriod : 'all visible'} data as CSV`}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="chart-panel-body">
          {!showTable ? (
            <ComparisonChart
              data={chartData}
              unit={unit}
              lowerIsBetter={lowerIsBetter}
              accentColor={accentColor}
              selectedPeriod={activePeriod}
              onPeriodClick={setClickedPeriod}
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
              onPeriodClick={setClickedPeriod}
            />
          )}
        </div>
      </div>

      {/* Dynamic Focus Period Header */}
      <div className="kpi-section__period-focus">
        <div className="kpi-section__period-focus-badge" style={{ borderLeft: `3px solid ${accentColor}` }}>
          Focused Period: <strong>{activePeriod} / {effectiveYear.substring(1)}</strong>
          {hasLocalOverride && <span className="kpi-section__local-badge"> · local view</span>}
        </div>
        <div className="kpi-section__period-focus-hint">
          {clickedPeriod ? (
            <button className="kpi-section__period-reset-btn" onClick={() => setClickedPeriod(null)}>
              Reset to {effectiveSubPeriod}
            </button>
          ) : (
            <span>Click on a chart column or table row to focus a period — then export that slice</span>
          )}
        </div>
      </div>

      <div className="kpi-section__actions">
        <ActionPlanPanel
          kpiKey={kpiKey}
          kpiName={title}
          period={effectivePeriod}
          selectedYear={effectiveYear}
          periodLabel={activePeriod}
        />
        <EvidencePanel
          kpiKey={kpiKey}
          kpiName={title}
          selectedYear={effectiveYear}
          periodLabel={activePeriod}
        />
      </div>
    </div>
  );
}
