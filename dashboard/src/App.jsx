import { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPISection from './components/KPISection';
import PeriodFilter from './components/PeriodFilter';
import ActivePeriodBanner from './components/ActivePeriodBanner';
import KPIComparisonMatrix from './components/KPIComparisonMatrix';
import MetricsModal from './components/MetricsModal';
import { DollarSign, Plane, Package, Calendar, ArrowLeftRight, Lightbulb } from 'lucide-react';

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
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  const [selectedSubPeriod, setSelectedSubPeriod] = useState('May'); // 'Jan'..'Dec', 'Q1'..'Q4', 'H1'..'H2', 'Y26'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [comparisonMode, setComparisonMode] = useState('yoy'); // 'yoy' | 'target' | 'ytd'
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  const prevYear = `Y${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${prevYear.substring(1)}`;

  // Handle high-level period change and reset sub-period gracefully
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'monthly') setSelectedSubPeriod('May');
    else if (newPeriod === 'quarterly') setSelectedSubPeriod('Q1');
    else if (newPeriod === 'semiannual') setSelectedSubPeriod('H1');
    else setSelectedSubPeriod(selectedYear);
  };

  // Helper: Get metric details for chosen sub-period and comparison mode
  const getSubPeriodMetric = (monthlyArr, quarterlyArr, valueKey) => {
    const isRatio = valueKey === 'ratio';

    let currentVal = null;
    let targetVal = null;
    let achievementVal = null;
    let prevVal = null;
    let subLabel = '';

    if (period === 'monthly') {
      subLabel = `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
      const curData = monthlyArr.find((d) => d.year === selectedYear && d.month === selectedSubPeriod);
      const prevData = monthlyArr.find((d) => d.year === prevYear && d.month === selectedSubPeriod);

      if (curData) {
        currentVal = curData[valueKey];
        targetVal = !isRatio ? curData.target : null;
        achievementVal = !isRatio ? curData.achievement : null;
      }
      if (prevData) {
        prevVal = prevData[valueKey];
      }
    } else if (period === 'quarterly') {
      subLabel = `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
      const curData = quarterlyArr.find((d) => d.year === selectedYear && d.quarter === selectedSubPeriod);
      const prevData = quarterlyArr.find((d) => d.year === prevYear && d.quarter === selectedSubPeriod);

      if (curData) {
        currentVal = curData[valueKey];
        targetVal = !isRatio ? curData.target : null;
        achievementVal = !isRatio ? curData.achievement : null;
      }
      if (prevData) {
        prevVal = prevData[valueKey];
      }
    } else if (period === 'semiannual') {
      subLabel = `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
      const qList = selectedSubPeriod === 'H1' ? ['Q1', 'Q2'] : ['Q3', 'Q4'];
      const curQs = quarterlyArr.filter((d) => d.year === selectedYear && qList.includes(d.quarter));
      const prevQs = quarterlyArr.filter((d) => d.year === prevYear && qList.includes(d.quarter));

      const avg = (arr, field) => {
        const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
        return valid.length ? valid.reduce((s, d) => s + d[field], 0) / valid.length : null;
      };

      currentVal = avg(curQs, valueKey);
      prevVal = avg(prevQs, valueKey);
      targetVal = !isRatio ? avg(curQs, 'target') : null;
      achievementVal = !isRatio ? avg(curQs, 'achievement') : null;
    } else {
      // Annual
      subLabel = currentYearLabel;
      const curQs = quarterlyArr.filter((d) => d.year === selectedYear);
      const prevQs = quarterlyArr.filter((d) => d.year === prevYear);

      const avg = (arr, field) => {
        const valid = arr.filter((d) => d[field] !== null && d[field] !== undefined);
        return valid.length ? valid.reduce((s, d) => s + d[field], 0) / valid.length : null;
      };

      currentVal = avg(curQs, valueKey);
      prevVal = avg(prevQs, valueKey);
      targetVal = !isRatio ? avg(curQs, 'target') : null;
      achievementVal = !isRatio ? avg(curQs, 'achievement') : null;
    }

    // Variations based on comparison mode
    let variation = null;
    let variationAbs = null;
    let previousLabel = null;
    let compareVal = null;

    if (comparisonMode === 'target') {
      previousLabel = `Meta (${subLabel})`;
      compareVal = targetVal;
      if (currentVal !== null && targetVal !== null) {
        variation = calculateVariation(currentVal, targetVal);
        variationAbs = currentVal - targetVal;
      }
    } else {
      // Default YoY / YTD
      previousLabel = `${subLabel} (${prevYearLabel.substring(2)})`;
      compareVal = prevVal;
      if (currentVal !== null && prevVal !== null) {
        variation = calculateVariation(currentVal, prevVal);
        variationAbs = currentVal - prevVal;
      }
    }

    // Sparkline points for selected year
    const sparkline = monthlyArr
      .filter((d) => d.year === selectedYear && d[valueKey] !== null)
      .map((d) => ({ value: d[valueKey] }));

    return {
      latest: currentVal,
      target: targetVal,
      achievement: achievementVal,
      variation,
      variationAbs,
      sparkline,
      prevLabel: previousLabel,
      prevValue: compareVal,
      subLabel,
    };
  };

  const logCostInfo = useMemo(
    () => getSubPeriodMetric(logisticCostData, quarterlyLogisticCost, 'result'),
    [selectedYear, period, selectedSubPeriod, comparisonMode]
  );

  const airFreightInfo = useMemo(
    () => getSubPeriodMetric(airFreightData, quarterlyAirFreight, 'result'),
    [selectedYear, period, selectedSubPeriod, comparisonMode]
  );

  const logVsProdInfo = useMemo(
    () => getSubPeriodMetric(logisticsCostVsProdData, quarterlyLogisticsCostVsProd, 'ratio'),
    [selectedYear, period, selectedSubPeriod, comparisonMode]
  );

  // Totals for production and logistics cost up to selected subperiod
  const kpi3Latest = useMemo(() => {
    const yearData = logisticsCostVsProdData.filter((d) => d.year === selectedYear && d.ratio !== null);
    if (yearData.length === 0) return { totalCost: null, totalProd: null, ratio: null };

    let filtered = yearData;
    if (period === 'monthly') {
      const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedSubPeriod);
      if (monthIdx !== -1) {
        filtered = yearData.slice(0, monthIdx + 1);
      }
    }

    const totalCost = filtered.reduce((s, d) => s + (d.logisticsCost || 0), 0);
    const totalProd = filtered.reduce((s, d) => s + (d.productionAmount || 0), 0);
    return { totalCost, totalProd };
  }, [selectedYear, period, selectedSubPeriod]);

  const kpi3PrevTotals = useMemo(() => {
    const prevData = logisticsCostVsProdData.filter((d) => d.year === prevYear && d.ratio !== null);
    if (prevData.length === 0) return { totalCost: null, totalProd: null };

    let filtered = prevData;
    if (period === 'monthly') {
      const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(selectedSubPeriod);
      if (monthIdx !== -1) {
        filtered = prevData.slice(0, monthIdx + 1);
      }
    }

    return {
      totalCost: filtered.reduce((s, d) => s + (d.logisticsCost || 0), 0),
      totalProd: filtered.reduce((s, d) => s + (d.productionAmount || 0), 0),
    };
  }, [selectedYear, prevYear, period, selectedSubPeriod]);

  const prodVariation = kpi3PrevTotals.totalProd ? calculateVariation(kpi3Latest.totalProd, kpi3PrevTotals.totalProd) : null;
  const costVariation = kpi3PrevTotals.totalCost ? calculateVariation(kpi3Latest.totalCost, kpi3PrevTotals.totalCost) : null;

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
    if (comparisonMode === 'target') return `${selectedSubPeriod}/${currentYearLabel} × Meta (Target)`;
    if (comparisonMode === 'ytd') return `Acumulado ${currentYearLabel} × Acumulado ${prevYearLabel}`;
    return `${selectedSubPeriod}/${currentYearLabel} × ${selectedSubPeriod}/${prevYearLabel}`;
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem={activeTab} onNavigate={handleSidebarNavigate} onOpenHelp={() => setIsMetricsModalOpen(true)} />

      <div className="main-wrapper">
        <Header
          onOpenHelp={() => setIsMetricsModalOpen(true)}
          activePeriodText={`${selectedSubPeriod} / ${currentYearLabel}`}
        />

        <main className="dashboard-main">
          {/* Active Period Banner */}
          <ActivePeriodBanner
            periodType={period}
            selectedSubPeriod={selectedSubPeriod}
            selectedYear={selectedYear}
            comparisonMode={comparisonMode}
          />

          {/* Period & Comparison Controls Area */}
          <div className="period-section">
            <div className="period-filter-card">
              <div className="period-filter-card__label">
                <Calendar size={14} />
                Filtro de Período & Agrupamento
              </div>
              <PeriodFilter
                activePeriod={period}
                onPeriodChange={handlePeriodChange}
                selectedSubPeriod={selectedSubPeriod}
                onSubPeriodChange={setSelectedSubPeriod}
              />
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
                  {currentYearLabel} × {prevYearLabel} (YoY)
                </button>
                <button
                  className={`comparison-pill ${comparisonMode === 'target' ? 'active' : ''}`}
                  onClick={() => setComparisonMode('target')}
                >
                  {currentYearLabel} × Meta (Target)
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
                  {activeTab === 'logisticCost' && `No período ${selectedSubPeriod}/${currentYearLabel.substring(2)}, o custo logístico situou-se em ${logCostInfo.latest ? (logCostInfo.latest * 100).toFixed(2) + '%' : 'N/A'}.`}
                  {activeTab === 'airFreight' && `O uso de frete aéreo em ${selectedSubPeriod} registrou ${airFreightInfo.latest ? (airFreightInfo.latest * 100).toFixed(2) + '%' : 'N/A'}.`}
                  {activeTab === 'logisticsVsProd' && `O volume acumulado de produção até ${selectedSubPeriod} atingiu $${kpi3Latest.totalProd ? kpi3Latest.totalProd.toFixed(2) : '0'} MUSD.`}
                </span>
              </div>
            </div>
          )}

          {/* Consolidated KPI Comparison Matrix */}
          <KPIComparisonMatrix
            selectedSubPeriod={selectedSubPeriod}
            selectedYear={selectedYear}
            comparisonMode={comparisonMode}
            logCostInfo={logCostInfo}
            airFreightInfo={airFreightInfo}
            logVsProdInfo={logVsProdInfo}
          />

          {/* KPI Detail Sections */}
          {(activeTab === 'dashboard' || activeTab === 'logisticCost') && (
            <div id="logisticCost">
              <KPISection
                kpiKey="logisticCost"
                title="Evolução do Custo Logístico (War Room Report)"
                icon={DollarSign}
                monthlyData={logisticCostData}
                quarterlyData={quarterlyLogisticCost}
                accentColor="#E7194A"
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
                accentColor="#F59E0B"
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
                accentColor="#22C55E"
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
