import { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICard from './components/KPICard';
import KPISection from './components/KPISection';
import PeriodFilter from './components/PeriodFilter';
import MetricsModal from './components/MetricsModal';
import { DollarSign, Plane, Package, Calendar, ArrowLeftRight, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

import {
  logisticCostData,
  airFreightData,
  logisticsCostVsProdData,
  quarterlyLogisticCost,
  quarterlyAirFreight,
  quarterlyLogisticsCostVsProd,
  calculateVariation,
} from './data/mockData';

function App() {
  const [selectedYear, setSelectedYear] = useState('Y26');
  const [period, setPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [comparisonMode, setComparisonMode] = useState('yoy'); // 'yoy' | 'target' | 'ytd'
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  const prevYear = `Y${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${prevYear.substring(1)}`;

  // Helper: get latest data info for a KPI based on comparison mode
  const getLatestInfo = (dataArray, valueKey) => {
    const yearData = dataArray.filter((d) => d.year === selectedYear);
    let latestIndex = -1;
    for (let i = yearData.length - 1; i >= 0; i--) {
      if (yearData[i][valueKey] !== null && yearData[i][valueKey] !== undefined) {
        latestIndex = i;
        break;
      }
    }

    if (latestIndex === -1) {
      return { latest: null, target: null, achievement: null, variation: null, variationAbs: null, sparkline: [], prevLabel: null, prevValue: null, latestMonth: null };
    }

    const latestData = yearData[latestIndex];
    const currentValue = latestData[valueKey];
    const targetValue = latestData.target;
    const achievement = latestData.achievement;
    const latestMonth = latestData.month;

    // Compare vs YoY or vs Target
    const prevData = dataArray.filter((d) => d.year === prevYear);
    const samePrev = prevData.find((d) => d.month === latestData.month);
    
    let variation = null;
    let variationAbs = null;
    let prevLabel = null;
    let prevValue = null;

    if (comparisonMode === 'target') {
      prevLabel = `Meta (${latestMonth})`;
      prevValue = targetValue;
      if (targetValue !== null && targetValue !== undefined) {
        variation = calculateVariation(currentValue, targetValue);
        variationAbs = currentValue - targetValue;
      }
    } else {
      // Default YoY
      prevLabel = samePrev ? `${latestMonth}/${prevYearLabel}` : null;
      prevValue = samePrev ? samePrev[valueKey] : null;
      if (samePrev && samePrev[valueKey] !== null) {
        variation = calculateVariation(currentValue, samePrev[valueKey]);
        variationAbs = currentValue - samePrev[valueKey];
      }
    }

    // Sparkline: valid data points from this year
    const sparkline = yearData
      .filter((d) => d[valueKey] !== null && d[valueKey] !== undefined)
      .map((d) => ({ value: d[valueKey] }));

    return { latest: currentValue, target: targetValue, achievement, variation, variationAbs, sparkline, prevLabel, prevValue, latestMonth };
  };

  const logCostInfo = useMemo(() => getLatestInfo(logisticCostData, 'result'), [selectedYear, comparisonMode]);
  const airFreightInfo = useMemo(() => getLatestInfo(airFreightData, 'result'), [selectedYear, comparisonMode]);
  const logVsProdInfo = useMemo(() => getLatestInfo(logisticsCostVsProdData, 'ratio'), [selectedYear, comparisonMode]);

  // Second row cards: get extra metrics from KPI3
  const kpi3Latest = useMemo(() => {
    const yearData = logisticsCostVsProdData.filter((d) => d.year === selectedYear);
    const validData = yearData.filter((d) => d.ratio !== null);
    if (validData.length === 0) return { totalCost: null, totalProd: null, ratio: null };
    const latest = validData[validData.length - 1];
    const totalCost = validData.reduce((s, d) => s + (d.logisticsCost || 0), 0);
    const totalProd = validData.reduce((s, d) => s + (d.productionAmount || 0), 0);
    return { totalCost, totalProd, ratio: latest.ratio, latestCost: latest.logisticsCost, latestProd: latest.productionAmount };
  }, [selectedYear]);

  // Previous year same-period totals for second row
  const kpi3PrevTotals = useMemo(() => {
    const prevData = logisticsCostVsProdData.filter((d) => d.year === prevYear);
    const validPrev = prevData.filter((d) => d.ratio !== null);
    const yearData = logisticsCostVsProdData.filter((d) => d.year === selectedYear);
    const monthCount = yearData.filter((d) => d.ratio !== null).length;
    const samePrev = validPrev.slice(0, monthCount);
    if (samePrev.length === 0) return { totalCost: null, totalProd: null };
    return {
      totalCost: samePrev.reduce((s, d) => s + (d.logisticsCost || 0), 0),
      totalProd: samePrev.reduce((s, d) => s + (d.productionAmount || 0), 0),
    };
  }, [selectedYear]);

  const prodVariation = kpi3PrevTotals.totalProd ? calculateVariation(kpi3Latest.totalProd, kpi3PrevTotals.totalProd) : null;
  const costVariation = kpi3PrevTotals.totalCost ? calculateVariation(kpi3Latest.totalCost, kpi3PrevTotals.totalCost) : null;

  // Find the latest month label for comparison card
  const latestMonth = logCostInfo.latestMonth || airFreightInfo.latestMonth || 'May';

  const handleSidebarNavigate = (itemId) => {
    setActiveTab(itemId);
    if (itemId === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const elem = document.getElementById(itemId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getComparisonLabel = () => {
    if (comparisonMode === 'target') return `${latestMonth}/${currentYearLabel} × Meta (Target)`;
    if (comparisonMode === 'ytd') return `Acumulado ${currentYearLabel} × Acumulado ${prevYearLabel}`;
    return `${latestMonth}/${currentYearLabel} × ${latestMonth}/${prevYearLabel}`;
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem={activeTab} onNavigate={handleSidebarNavigate} onOpenHelp={() => setIsMetricsModalOpen(true)} />

      <div className="main-wrapper">
        <Header onOpenHelp={() => setIsMetricsModalOpen(true)} />

        <main className="dashboard-main">
          {/* Period & Comparison Controls Area */}
          <div className="period-section">
            <div className="period-filter-card">
              <div className="period-filter-card__label">
                <Calendar size={14} />
                Agrupamento do Gráfico
              </div>
              <PeriodFilter activePeriod={period} onChange={setPeriod} />
            </div>

            <div className="comparison-card">
              <div className="comparison-card__label">
                <ArrowLeftRight size={14} />
                Base de Comparação dos KPIs
              </div>
              <div className="comparison-card__value">
                {getComparisonLabel()}
              </div>
              <div className="comparison-selector">
                <button
                  className={`comparison-pill ${comparisonMode === 'yoy' ? 'active' : ''}`}
                  onClick={() => setComparisonMode('yoy')}
                >
                  2026 × 2025 (YoY)
                </button>
                <button
                  className={`comparison-pill ${comparisonMode === 'target' ? 'active' : ''}`}
                  onClick={() => setComparisonMode('target')}
                >
                  2026 × Meta (Target)
                </button>
                <button
                  className={`comparison-pill ${comparisonMode === 'ytd' ? 'active' : ''}`}
                  onClick={() => setComparisonMode('ytd')}
                >
                  Acumulado YTD
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Insight Banner based on Active Sidebar View */}
          {activeTab !== 'dashboard' && (
            <div className="insight-banner animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <Lightbulb size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                  Insight Executivo — {activeTab === 'logisticCost' ? 'War Room Report (Logistic Cost KPI TV)' : activeTab === 'airFreight' ? 'Air Freight KPI TV' : 'Logistic Cost x Product Amount'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {activeTab === 'logisticCost' && 'Em Mai/26 o custo logístico situou-se em 4.70% do valor produzido, com atingimento de 97.0% da meta (4.56%). Em Jan/26, houve ganho de eficiência com 120.5% de atingimento.'}
                  {activeTab === 'airFreight' && 'O uso de frete aéreo em 2026 sofreu pressão de despesas não planejadas em Mar/26 (0.74% vs meta de 0.22%). Recomenda-se migração de urgências para o modal marítimo.'}
                  {activeTab === 'logisticsVsProd' && 'A proporção direta de custo por valor de produção mantém estabilidade em ~4.4%. O volume acumulado de produção atingiu $277.94 MUSD com despesa logística acumulada de $12.23 MUSD.'}
                </span>
              </div>
            </div>
          )}

          {/* KPI Cards — Row 1 (main metrics) */}
          <div className="kpi-cards-grid">
            <KPICard
              title="Custo Logístico Total"
              variant="logistic"
              currentValue={logCostInfo.latest}
              targetValue={logCostInfo.target}
              achievement={logCostInfo.achievement}
              variation={logCostInfo.variation}
              variationAbsolute={logCostInfo.variationAbs}
              sparklineData={logCostInfo.sparkline}
              unit="%"
              lowerIsBetter={true}
              previousLabel={logCostInfo.prevLabel}
              previousValue={logCostInfo.prevValue}
              onClick={() => handleSidebarNavigate('logisticCost')}
            />
            <KPICard
              title="Custo Médio — Air Freight"
              variant="airfreight"
              currentValue={airFreightInfo.latest}
              targetValue={airFreightInfo.target}
              achievement={airFreightInfo.achievement}
              variation={airFreightInfo.variation}
              variationAbsolute={airFreightInfo.variationAbs}
              sparklineData={airFreightInfo.sparkline}
              unit="%"
              lowerIsBetter={true}
              previousLabel={airFreightInfo.prevLabel}
              previousValue={airFreightInfo.prevValue}
              onClick={() => handleSidebarNavigate('airFreight')}
            />
            <KPICard
              title="Custo por Valor de Produção"
              variant="production"
              currentValue={logVsProdInfo.latest}
              targetValue={null}
              achievement={null}
              variation={logVsProdInfo.variation}
              variationAbsolute={logVsProdInfo.variationAbs}
              sparklineData={logVsProdInfo.sparkline}
              unit="Ratio"
              lowerIsBetter={true}
              previousLabel={logVsProdInfo.prevLabel}
              previousValue={logVsProdInfo.prevValue}
              onClick={() => handleSidebarNavigate('logisticsVsProd')}
            />
          </div>

          {/* KPI Cards — Row 2 (derived metrics) */}
          <div className="kpi-cards-grid">
            <KPICard
              title="Valor Total de Produção"
              variant="production"
              currentValue={kpi3Latest.totalProd}
              variation={prodVariation}
              variationAbsolute={kpi3PrevTotals.totalProd ? kpi3Latest.totalProd - kpi3PrevTotals.totalProd : null}
              sparklineData={logisticsCostVsProdData
                .filter((d) => d.year === selectedYear && d.productionAmount !== null)
                .map((d) => ({ value: d.productionAmount }))}
              unit="MUSD"
              lowerIsBetter={false}
              previousLabel={`Acum. ${prevYearLabel}`}
              previousValue={kpi3PrevTotals.totalProd}
            />
            <KPICard
              title="Custo Logístico Acumulado"
              variant="logistic"
              currentValue={kpi3Latest.totalCost}
              variation={costVariation}
              variationAbsolute={kpi3PrevTotals.totalCost ? kpi3Latest.totalCost - kpi3PrevTotals.totalCost : null}
              sparklineData={logisticsCostVsProdData
                .filter((d) => d.year === selectedYear && d.logisticsCost !== null)
                .map((d) => ({ value: d.logisticsCost }))}
              unit="MUSD"
              lowerIsBetter={true}
              previousLabel={`Acum. ${prevYearLabel}`}
              previousValue={kpi3PrevTotals.totalCost}
            />
            <KPICard
              title="Percentual de Atingimento"
              variant="airfreight"
              currentValue={logCostInfo.achievement}
              variation={null}
              sparklineData={logisticCostData
                .filter((d) => d.year === selectedYear && d.achievement !== null)
                .map((d) => ({ value: d.achievement }))}
              unit="achievement"
              lowerIsBetter={false}
              previousLabel="Meta"
              previousValue={logCostInfo.target}
            />
          </div>

          {/* KPI Detail Sections */}
          {(activeTab === 'dashboard' || activeTab === 'logisticCost') && (
            <div id="logisticCost">
              <KPISection
                kpiKey="logisticCost"
                title="Evolução do Custo Logístico (War Room Report)"
                icon={DollarSign}
                monthlyData={logisticCostData}
                quarterlyData={quarterlyLogisticCost}
                accentColor="#3b82f6"
                lowerIsBetter={true}
                unit="%"
                selectedYear={selectedYear}
                period={period}
              />
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'airFreight') && (
            <div id="airFreight">
              <KPISection
                kpiKey="airFreight"
                title="Air Freight KPI TV"
                icon={Plane}
                monthlyData={airFreightData}
                quarterlyData={quarterlyAirFreight}
                accentColor="#14b8a6"
                lowerIsBetter={true}
                unit="%"
                selectedYear={selectedYear}
                period={period}
              />
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'logisticsVsProd') && (
            <div id="logisticsVsProd">
              <KPISection
                kpiKey="logisticsVsProd"
                title="Logistics Cost x Product Amount"
                icon={Package}
                monthlyData={logisticsCostVsProdData}
                quarterlyData={quarterlyLogisticsCostVsProd}
                accentColor="#8b5cf6"
                lowerIsBetter={true}
                unit="Ratio"
                selectedYear={selectedYear}
                period={period}
              />
            </div>
          )}
        </main>

        <footer className="dashboard-footer">
          Dashboard KPI Logístico — Protótipo v1.0 | Base de referência: GERP & ARUM System (dados.xlsx) | LG Electronics DXI
        </footer>
      </div>

      {/* Metrics Explanation Modal */}
      <MetricsModal isOpen={isMetricsModalOpen} onClose={() => setIsMetricsModalOpen(false)} />
    </div>
  );
}

export default App;

