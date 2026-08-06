import { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICard from './components/KPICard';
import KPISection from './components/KPISection';
import PeriodFilter from './components/PeriodFilter';
import { DollarSign, Plane, Package, Calendar, ArrowLeftRight } from 'lucide-react';

import {
  logisticCostData,
  airFreightData,
  logisticsCostVsProdData,
  quarterlyLogisticCost,
  quarterlyAirFreight,
  quarterlyLogisticsCostVsProd,
  calculateVariation,
  MONTHS,
} from './data/mockData';

function App() {
  const [selectedYear, setSelectedYear] = useState('Y26');
  const [period, setPeriod] = useState('monthly');

  const prevYear = `Y${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${prevYear.substring(1)}`;

  // Helper: get latest data info for a KPI
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

    // YoY comparison
    const prevData = dataArray.filter((d) => d.year === prevYear);
    const samePrev = prevData.find((d) => d.month === latestData.month);
    let variation = null;
    let variationAbs = null;
    if (samePrev && samePrev[valueKey] !== null) {
      variation = calculateVariation(currentValue, samePrev[valueKey]);
      variationAbs = currentValue - samePrev[valueKey];
    }

    // Sparkline: valid data points from this year
    const sparkline = yearData
      .filter((d) => d[valueKey] !== null && d[valueKey] !== undefined)
      .map((d) => ({ value: d[valueKey] }));

    // Previous year same month value
    const prevLabel = samePrev ? `${latestMonth}/${prevYearLabel}` : null;
    const prevValue = samePrev ? samePrev[valueKey] : null;

    return { latest: currentValue, target: targetValue, achievement, variation, variationAbs, sparkline, prevLabel, prevValue, latestMonth };
  };

  const logCostInfo = useMemo(() => getLatestInfo(logisticCostData, 'result'), [selectedYear]);
  const airFreightInfo = useMemo(() => getLatestInfo(airFreightData, 'result'), [selectedYear]);
  const logVsProdInfo = useMemo(() => getLatestInfo(logisticsCostVsProdData, 'ratio'), [selectedYear]);

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

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      <Sidebar activeItem="dashboard" />

      <div className="main-wrapper">
        <Header />

        <main className="dashboard-main">
          {/* Period Filter Area */}
          <div className="period-section">
            <div className="period-filter-card">
              <div className="period-filter-card__label">
                <Calendar size={14} />
                Período de Análise
              </div>
              <PeriodFilter activePeriod={period} onChange={setPeriod} />
            </div>
            <div className="comparison-card">
              <div className="comparison-card__label">
                <ArrowLeftRight size={14} />
                Comparação
              </div>
              <div className="comparison-card__value">
                {latestMonth}/{currentYearLabel} <span>×</span> {latestMonth}/{prevYearLabel}
              </div>
              <div className="comparison-card__desc">
                Comparação fixa com o mesmo período do ano anterior.
              </div>
            </div>
          </div>

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
              onClick={() => scrollToSection('logisticCost')}
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
              onClick={() => scrollToSection('airFreight')}
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
              onClick={() => scrollToSection('logisticsVsProd')}
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
          <div id="logisticCost">
            <KPISection
              kpiKey="logisticCost"
              title="Evolução do Custo Logístico"
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
        </main>

        <footer className="dashboard-footer">
          Dashboard KPI Logístico — Protótipo v1.0 | Dados de referência: dados.xlsx | Gerado para validação com gestão
        </footer>
      </div>
    </div>
  );
}

export default App;
