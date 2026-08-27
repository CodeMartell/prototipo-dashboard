import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPISection from './components/KPISection';
import PeriodFilter from './components/PeriodFilter';
import KPICard from './components/KPICard';
import KPIComparisonMatrix from './components/KPIComparisonMatrix';
import MetricsModal from './components/MetricsModal';
import AnalyticsPanel from './components/AnalyticsPanel';
import { DollarSign, Plane, Package, Calendar, Lightbulb, AlertTriangle, TrendingDown, Anchor, Layers } from 'lucide-react';
import { fetchDashboardData, getCurrentUser, logout, UnauthorizedError } from './services/api';

import {
  MONTHS,
  logisticCostData,
  airFreightData,
  logisticsCostVsProdData,
  incidentialCostData,
  totalCostData,
  demurrageData,
  quarterlyLogisticCost,
  quarterlyAirFreight,
  quarterlyLogisticsCostVsProd,
  quarterlyIncidentialCost,
  quarterlyTotalCost,
  quarterlyDemurrage,
  calculateVariation,
  getAvailableYears,
} from './data/mockData';

import { runFullAnalysis, getDefaultConfigs } from './utils/analyticsEngine';

function App() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getCurrentUser());

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [selectedYear, setSelectedYear] = useState('Y26');
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  const [selectedSubPeriod, setSelectedSubPeriod] = useState('May'); // 'Jan'..'Dec', 'Q1'..'Q4', 'H1'..'H2', 'Y26'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  // --- ANALYTICS ENGINE STATES ---
  // Initialized with mocks; replaced by API data when available.
  const [logisticCostState, setLogisticCostState] = useState(logisticCostData);
  const [airFreightState, setAirFreightState] = useState(airFreightData);
  const [logisticsVsProdState, setLogisticsVsProdState] = useState(logisticsCostVsProdData);

  // Indicates data source of currently displayed metrics
  const [dataSource, setDataSource] = useState('mock'); // 'mock' | 'api'

  // --- LOADING API DATA ---
  const loadFromApi = useCallback(() => {
    fetchDashboardData()
      .then((data) => {
        if (data.logistic_cost?.length) setLogisticCostState(data.logistic_cost);
        if (data.air_freight?.length) setAirFreightState(data.air_freight);
        if (data.logistics_vs_prod?.length) setLogisticsVsProdState(data.logistics_vs_prod);
        setDataSource('api');
        console.info('[DataLens] Data loaded from API successfully.');
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate('/login');
          return;
        }
        console.warn('[DataLens] API unavailable, using mock data:', err.message);
        setDataSource('mock');
      });
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [navigate]);

  // Load API data on component mount
  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  const availableYears = useMemo(() => {
    return getAvailableYears([logisticCostState, airFreightState, logisticsVsProdState]);
  }, [logisticCostState, airFreightState, logisticsVsProdState]);

  const [configs, setConfigs] = useState(() => {
    const saved = localStorage.getItem('analytics_configs');
    return saved ? JSON.parse(saved) : getDefaultConfigs();
  });

  const [auditLog, setAuditLog] = useState(() => {
    const saved = localStorage.getItem('analytics_audit_log');
    return saved ? JSON.parse(saved) : [
      {
        id: 'initial',
        action: 'System Initialized',
        details: 'Consistency and anomaly analysis engine activated.',
        timestamp: new Date().toISOString(),
        user: 'System'
      }
    ];
  });

  const [alerts, setAlerts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Salvar configurações e logs nos efeitos colaterais
  useEffect(() => {
    localStorage.setItem('analytics_configs', JSON.stringify(configs));
  }, [configs]);

  useEffect(() => {
    localStorage.setItem('analytics_audit_log', JSON.stringify(auditLog));
  }, [auditLog]);

  // Executar a análise de dados com dependências completas
  const runAnalysis = useCallback(() => {
    const results = runFullAnalysis(
      {
        logisticCost: logisticCostState,
        airFreight: airFreightState,
        logisticsVsProd: logisticsVsProdState
      },
      configs
    );
    
    const dismissedIds = JSON.parse(localStorage.getItem('analytics_dismissed_alerts') || '[]');
    const verifiedIds = JSON.parse(localStorage.getItem('analytics_verified_alerts') || '[]');
    
    const processedAlerts = results.filter(r => !dismissedIds.includes(r.id)).map(r => ({
      ...r,
      verified: verifiedIds.includes(r.id)
    }));

    setAlerts(processedAlerts);
  }, [logisticCostState, airFreightState, logisticsVsProdState, configs]);

  // Re-analisa se dados ou regras mudarem
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // --- EVENTOS DO PAINEL DE ANALYTICS ---
  
  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      runAnalysis();
      setIsAnalyzing(false);
      
      const results = runFullAnalysis(
        {
          logisticCost: logisticCostState,
          airFreight: airFreightState,
          logisticsVsProd: logisticsVsProdState
        },
        configs
      );
      
      const newLog = {
        id: `log-${Date.now()}`,
        action: 'Analysis Executed',
        details: `On-demand scan completed. ${results.length} irregularities identified in historical database.`,
        timestamp: new Date().toISOString(),
        user: 'Logistics & Admin'
      };
      setAuditLog(prev => [newLog, ...prev]);
    }, 800);
  };

  const handleInjectErrors = () => {
    // 1. Logistics Cost: null in Nov/Y25 and spike in May/Y26
    const newLogCost = logisticCostState.map(d => {
      if (d.month === 'Nov' && d.year === 'Y25') {
        return { ...d, result: null };
      }
      if (d.month === 'May' && d.year === 'Y26') {
        return { ...d, result: 0.165 }; // 16.5% (>8.0% max)
      }
      return d;
    });

    // 2. Air Freight: extreme spike in Jan/Y26 and duplicate in Jun/Y26
    let newAirFreight = airFreightState.map(d => {
      if (d.month === 'Jan' && d.year === 'Y26') {
        return { ...d, result: 0.045 }; // 4.5% (>1.0% max)
      }
      return d;
    });
    const hasDuplicate = newAirFreight.some(d => d.month === 'Jun' && d.year === 'Y26' && d.achievement === 0.25);
    if (!hasDuplicate) {
      newAirFreight.push({ month: 'Jun', year: 'Y26', target: 0.0022, result: 0.0085, achievement: 0.25 });
    }

    // 3. Ratio: mathematical conflict in Nov/Y26
    const newLogVsProd = logisticsVsProdState.map(d => {
      if (d.month === 'Nov' && d.year === 'Y26') {
        return { ...d, ratio: 0.0850 }; // Cost 1.30 / Prod 27.08 != 0.0850
      }
      return d;
    });

    // Clear local dismissed states so alerts reappear
    localStorage.setItem('analytics_dismissed_alerts', '[]');
    localStorage.setItem('analytics_verified_alerts', '[]');

    setLogisticCostState(newLogCost);
    setAirFreightState(newAirFreight);
    setLogisticsVsProdState(newLogVsProd);

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Error Injection',
      details: 'Artificial inconsistencies injected into database for system operational validation.',
      timestamp: new Date().toISOString(),
      user: 'Logistics & Admin'
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const handleVerifyAlert = (alertId) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const verifiedIds = JSON.parse(localStorage.getItem('analytics_verified_alerts') || '[]');
    if (!verifiedIds.includes(alertId)) {
      verifiedIds.push(alertId);
      localStorage.setItem('analytics_verified_alerts', JSON.stringify(verifiedIds));
    }

    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, verified: true } : a));

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Alert Verified',
      details: `Verification completed: ${alert.kpiName} (${alert.period}) - ${alert.message}`,
      timestamp: new Date().toISOString(),
      user: 'Logistics & Admin'
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const handleDismissAlert = (alertId) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const dismissedIds = JSON.parse(localStorage.getItem('analytics_dismissed_alerts') || '[]');
    if (!dismissedIds.includes(alertId)) {
      dismissedIds.push(alertId);
      localStorage.setItem('analytics_dismissed_alerts', JSON.stringify(dismissedIds));
    }

    setAlerts(prev => prev.filter(a => a.id !== alertId));

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Alert Dismissed',
      details: `Dismissal performed by operator: ${alert.kpiName} (${alert.period}) - ${alert.message}`,
      timestamp: new Date().toISOString(),
      user: 'Logistics & Admin'
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const handleUpdateConfig = (kpiKey, field, value) => {
    setConfigs(prev => ({
      ...prev,
      [kpiKey]: {
        ...prev[kpiKey],
        [field]: value
      }
    }));
  };

  const handleRestoreDefaults = () => {
    setConfigs(getDefaultConfigs());
    setLogisticCostState(logisticCostData);
    setAirFreightState(airFreightData);
    setLogisticsVsProdState(logisticsCostVsProdData);
    setDataSource('mock');
    localStorage.setItem('analytics_dismissed_alerts', '[]');
    localStorage.setItem('analytics_verified_alerts', '[]');

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Defaults Restored',
      details: 'Factory parameters and original database reloaded successfully.',
      timestamp: new Date().toISOString(),
      user: 'Logistics & Admin'
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const handleClearAuditLog = () => {
    setAuditLog([]);
  };

  // --- ALERT FILTERS FOR BADGES AND UI ---
  const activeAlerts = useMemo(() => alerts.filter(a => !a.verified), [alerts]);
  
  const kpisWithAlerts = useMemo(() => {
    return Array.from(new Set(activeAlerts.map(a => a.kpiKey)));
  }, [activeAlerts]);

  const totalRecordsChecked = logisticCostState.length + airFreightState.length + logisticsVsProdState.length;

  const prevYear = `Y${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${prevYear.substring(1)}`;

  // Reset subperiod when period type changes
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'monthly') setSelectedSubPeriod('May');
    else if (newPeriod === 'quarterly') setSelectedSubPeriod('Q1');
    else if (newPeriod === 'semiannual') setSelectedSubPeriod('H1');
    else setSelectedSubPeriod(selectedYear);
  };

  // Aggregate field values (avg for rates, sum for absolute values)
  const aggregateField = (rows, field, mode) => {
    const valid = rows.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    const total = valid.reduce((s, d) => s + d[field], 0);
    return mode === 'sum' ? total : total / valid.length;
  };

  // Select period rows for active period
  const selectPeriodRows = useCallback((monthlyArr, quarterlyArr, year) => {
    if (period === 'monthly') {
      return monthlyArr.filter((d) => d.year === year && d.month === selectedSubPeriod);
    }
    if (period === 'quarterly') {
      return quarterlyArr.filter((d) => d.year === year && d.quarter === selectedSubPeriod);
    }
    if (period === 'semiannual') {
      const qList = selectedSubPeriod === 'H1' ? ['Q1', 'Q2'] : ['Q3', 'Q4'];
      return quarterlyArr.filter((d) => d.year === year && qList.includes(d.quarter));
    }
    return quarterlyArr.filter((d) => d.year === year);
  }, [period, selectedSubPeriod]);

  // Calculate period stats
  const getPeriodStats = useCallback((monthlyArr, quarterlyArr, year, valueKey, aggregate) => {
    const isRatio = valueKey === 'ratio';
    const rows = selectPeriodRows(monthlyArr, quarterlyArr, year);

    const result = aggregateField(rows, valueKey, aggregate);
    const target = isRatio ? null : aggregateField(rows, 'target', aggregate);

    let achievement = null;
    if (!isRatio) {
      if (aggregate === 'sum') {
        achievement = result && target ? target / result : null;
      } else {
        achievement = aggregateField(rows, 'achievement', 'avg');
      }
    }

    return { result, target, achievement };
  }, [selectPeriodRows]);

  // Subperiod metrics helper
  const getSubPeriodMetric = useCallback((monthlyArr, quarterlyArr, valueKey = 'result', aggregate = 'avg') => {
    const isAnnual = period === 'annual';
    const subLabel = isAnnual ? currentYearLabel : `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
    const prevSubLabel = isAnnual ? prevYearLabel : `${selectedSubPeriod}/${prevYearLabel.substring(2)}`;

    const current = getPeriodStats(monthlyArr, quarterlyArr, selectedYear, valueKey, aggregate);
    const previous = getPeriodStats(monthlyArr, quarterlyArr, prevYear, valueKey, aggregate);

    let variation = null;
    let variationAbs = null;
    if (current.result !== null && previous.result !== null) {
      variation = calculateVariation(current.result, previous.result);
      variationAbs = current.result - previous.result;
    }

    // Sparkline with monthly series of selected year
    const sparkline = monthlyArr
      .filter((d) => d.year === selectedYear && d[valueKey] !== null && d[valueKey] !== undefined)
      .map((d) => ({ value: d[valueKey] }));

    return {
      latest: current.result,
      target: current.target,
      achievement: current.achievement,
      prevValue: previous.result,
      prevTarget: previous.target,
      prevAchievement: previous.achievement,
      variation,
      variationAbs,
      sparkline,
      prevLabel: prevSubLabel,
      subLabel,
      prevSubLabel,
    };
  }, [period, currentYearLabel, selectedSubPeriod, prevYearLabel, getPeriodStats, selectedYear, prevYear]);

  // KPI Definitions for cards and comparative matrix
  const KPI_DEFINITIONS = useMemo(() => [
    { key: 'warRoom', name: 'War Room Report', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#3B82F6', monthly: logisticCostState, quarterly: quarterlyLogisticCost, description: 'Logistics cost over revenue' },
    { key: 'incidentialCost', name: 'Logistics Cost Resin Consolidtion', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#2563EB', monthly: incidentialCostData, quarterly: quarterlyIncidentialCost, description: 'Incidential costs over revenue' },
    { key: 'totalCost', name: 'Task Cost Reduction', unit: 'MUSD', aggregate: 'sum', valueKey: 'result', color: '#1D4ED8', monthly: totalCostData, quarterly: quarterlyTotalCost, description: 'Total logistics cost' },
    { key: 'demurrage', name: 'KPI - Demurrage Cost', unit: 'KUSD', aggregate: 'sum', valueKey: 'result', color: '#0EA5E9', monthly: demurrageData, quarterly: quarterlyDemurrage, description: 'Container demurrage' },
    { key: 'airFreight', name: 'KPI - Air Freight', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#38BDF8', monthly: airFreightState, quarterly: quarterlyAirFreight, description: 'Air freight over revenue' },
  ], [logisticCostState, airFreightState]);

  const kpiMetrics = useMemo(
    () =>
      KPI_DEFINITIONS.map((def) => ({
        ...def,
        lowerIsBetter: true,
        ...getSubPeriodMetric(def.monthly, def.quarterly, def.valueKey, def.aggregate),
      })),
    [KPI_DEFINITIONS, getSubPeriodMetric]
  );

  const logCostInfo = useMemo(
    () => getSubPeriodMetric(logisticCostState, quarterlyLogisticCost, 'result'),
    [logisticCostState, getSubPeriodMetric]
  );

  const airFreightInfo = useMemo(
    () => getSubPeriodMetric(airFreightState, quarterlyAirFreight, 'result'),
    [airFreightState, getSubPeriodMetric]
  );

  // Totals for production and logistics cost up to selected subperiod
  const kpi3Latest = useMemo(() => {
    const yearData = logisticsVsProdState.filter((d) => d.year === selectedYear && d.ratio !== null);
    if (yearData.length === 0) return { totalCost: null, totalProd: null, ratio: null };

    let filtered = yearData;
    if (period === 'monthly') {
      const monthIdx = MONTHS.indexOf(selectedSubPeriod);
      if (monthIdx !== -1) {
        filtered = yearData.slice(0, monthIdx + 1);
      }
    }

    const totalCost = filtered.reduce((s, d) => s + (d.logisticsCost || 0), 0);
    const totalProd = filtered.reduce((s, d) => s + (d.productionAmount || 0), 0);
    return { totalCost, totalProd };
  }, [logisticsVsProdState, selectedYear, period, selectedSubPeriod]);

  const handleSidebarNavigate = (itemId) => {
    setActiveTab(itemId);
    if (itemId === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (itemId !== 'analytics') {
      // Small delay to allow the DOM to render the section before scrolling
      setTimeout(() => {
        const elem = document.getElementById(itemId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  // Filter inline alerts per indicator
  const lcAlerts = useMemo(() => activeAlerts.filter(a => a.kpiKey === 'logisticCost'), [activeAlerts]);
  const afAlerts = useMemo(() => activeAlerts.filter(a => a.kpiKey === 'airFreight'), [activeAlerts]);
  const lpAlerts = useMemo(() => activeAlerts.filter(a => a.kpiKey === 'logisticsVsProd'), [activeAlerts]);

  return (
    <div className="app-layout">
      <Sidebar 
        activeItem={activeTab} 
        onNavigate={handleSidebarNavigate} 
        onOpenHelp={() => setIsMetricsModalOpen(true)} 
        alertsCount={activeAlerts.length}
        kpisWithAlerts={kpisWithAlerts}
      />

      <div className="main-wrapper">
        <Header
          alerts={activeAlerts}
          onNavigate={handleSidebarNavigate}
          onVerifyAlert={handleVerifyAlert}
          onDismissAlert={handleDismissAlert}
          user={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="dashboard-main">
          {activeTab === 'analytics' ? (
            <AnalyticsPanel
              alerts={alerts}
              auditLog={auditLog}
              configs={configs}
              datasets={{
                logisticCost: logisticCostState,
                airFreight: airFreightState,
                logisticsVsProd: logisticsVsProdState,
              }}
              availableYears={availableYears}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              onUpdateConfig={handleUpdateConfig}
              onRestoreDefaults={handleRestoreDefaults}
              onRunAnalysis={handleRunAnalysis}
              onInjectErrors={handleInjectErrors}
              onVerifyAlert={handleVerifyAlert}
              onDismissAlert={handleDismissAlert}
              onClearAuditLog={handleClearAuditLog}
              isAnalyzing={isAnalyzing}
              totalRecordsChecked={totalRecordsChecked}
            />
          ) : (
            <>
              {/* Period Controls Area */}
              <div className="period-section">
                <div className="period-filter-card">
                  <div className="period-filter-card__label">
                    <Calendar size={14} />
                    Period Filter & Grouping
                  </div>
                  <PeriodFilter
                    activePeriod={period}
                    onPeriodChange={handlePeriodChange}
                    selectedSubPeriod={selectedSubPeriod}
                    onSubPeriodChange={setSelectedSubPeriod}
                  />
                </div>
              </div>

              {/* Indicator Cards Grid */}
              <div className="kpi-cards-grid">
                {kpiMetrics.map((m) => (
                  <KPICard
                    key={m.key}
                    title={m.name}
                    subPeriodLabel={m.subLabel}
                    color={m.color}
                    unit={m.unit}
                    lowerIsBetter={m.lowerIsBetter}
                    currentValue={m.latest}
                    targetValue={m.target}
                    achievement={m.achievement}
                    variation={m.variation}
                    variationAbsolute={m.variationAbs}
                    sparklineData={m.sparkline}
                    previousLabel={m.prevLabel}
                    previousValue={m.prevValue}
                  />
                ))}
              </div>

              {/* Global warning banner */}
              {activeAlerts.length > 0 && (
                <div className="global-warning-banner animate-fade-in">
                  <AlertTriangle size={18} className="text-warning" />
                  <div className="global-warning-banner__text">
                    <strong>Data Quality Alert:</strong> Analysis engine detected {activeAlerts.length} inconsistency(ies) or anomalous fluctuation(s) in historical KPI database.
                  </div>
                  <button className="btn btn--sm btn--primary" onClick={() => setActiveTab('analytics')}>
                    Review in Analytics
                  </button>
                </div>
              )}

              {/* Dynamic Insight Banner */}
              {activeTab !== 'dashboard' && activeTab !== 'analytics' && (
                <div className="insight-banner animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                  <Lightbulb size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                      Executive Insight — {activeTab === 'logisticCost' ? 'War Room Report' : activeTab === 'airFreight' ? 'KPI - Air Freight' : activeTab === 'logisticsVsProd' ? 'KPI - Logistics Cost x Prod Amount' : activeTab === 'totalCost' ? 'Task Cost Reduction' : activeTab === 'demurrage' ? 'KPI - Demurrage Cost' : activeTab === 'incidentialCost' ? 'Logistics Cost Resin Consolidtion' : ''}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {activeTab === 'logisticCost' && `In period ${selectedSubPeriod}/${currentYearLabel.substring(2)}, logistics cost was at ${logCostInfo.latest ? (logCostInfo.latest * 100).toFixed(2) + '%' : 'N/A'}.`}
                      {activeTab === 'airFreight' && `Air freight usage in ${selectedSubPeriod} recorded ${airFreightInfo.latest ? (airFreightInfo.latest * 100).toFixed(2) + '%' : 'N/A'}.`}
                      {activeTab === 'logisticsVsProd' && `YTD accumulated production volume up to ${selectedSubPeriod} reached $${kpi3Latest.totalProd ? kpi3Latest.totalProd.toFixed(2) : '0'} MUSD.`}
                      {activeTab === 'totalCost' && `Task Cost Reduction tracking for period ${selectedSubPeriod}/${currentYearLabel.substring(2)}.`}
                      {activeTab === 'demurrage' && `Demurrage cost tracking for period ${selectedSubPeriod}/${currentYearLabel.substring(2)}.`}
                      {activeTab === 'incidentialCost' && `Logistics Cost Resin Consolidtion tracking for period ${selectedSubPeriod}/${currentYearLabel.substring(2)}.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Consolidated KPI Comparison Matrix */}
              <KPIComparisonMatrix
                periodType={period}
                selectedSubPeriod={selectedSubPeriod}
                selectedYear={selectedYear}
                metrics={kpiMetrics}
              />

              {/* KPI Detail Sections */}
              {(activeTab === 'dashboard' || activeTab === 'logisticCost') && (
                <div id="logisticCost" className="kpi-detail-wrapper">
                  {lcAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {lcAlerts.length} alert(s) in historical data. Latest critical record in <strong>{lcAlerts[0].period}</strong>: {lcAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Audit Record
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="logisticCost"
                    title="War Room Report"
                    icon={DollarSign}
                    monthlyData={logisticCostState}
                    quarterlyData={quarterlyLogisticCost}
                    accentColor="#3B82F6"
                    lowerIsBetter={true}
                    unit="%"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}

              {(activeTab === 'dashboard' || activeTab === 'airFreight') && (
                <div id="airFreight" className="kpi-detail-wrapper">
                  {afAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {afAlerts.length} alert(s) in historical data. Latest critical record in <strong>{afAlerts[0].period}</strong>: {afAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Audit Record
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="airFreight"
                    title="KPI - Air Freight"
                    icon={Plane}
                    monthlyData={airFreightState}
                    quarterlyData={quarterlyAirFreight}
                    accentColor="#38BDF8"
                    lowerIsBetter={true}
                    unit="%"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}

              {(activeTab === 'dashboard' || activeTab === 'logisticsVsProd') && (
                <div id="logisticsVsProd" className="kpi-detail-wrapper">
                  {lpAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {lpAlerts.length} alert(s) in historical data. Latest critical record in <strong>{lpAlerts[0].period}</strong>: {lpAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Audit Record
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="logisticsVsProd"
                    title="KPI - Logistics Cost x Prod Amount"
                    icon={Package}
                    monthlyData={logisticsVsProdState}
                    quarterlyData={quarterlyLogisticsCostVsProd}
                    accentColor="#1D4ED8"
                    lowerIsBetter={true}
                    unit="Ratio"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}

              {(activeTab === 'dashboard' || activeTab === 'totalCost') && (
                <div id="totalCost" className="kpi-detail-wrapper">
                  <KPISection
                    kpiKey="totalCost"
                    title="Task Cost Reduction"
                    icon={TrendingDown}
                    monthlyData={totalCostData}
                    quarterlyData={quarterlyTotalCost}
                    accentColor="#1D4ED8"
                    lowerIsBetter={true}
                    unit="MUSD"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}

              {(activeTab === 'dashboard' || activeTab === 'demurrage') && (
                <div id="demurrage" className="kpi-detail-wrapper">
                  <KPISection
                    kpiKey="demurrage"
                    title="KPI - Demurrage Cost"
                    icon={Anchor}
                    monthlyData={demurrageData}
                    quarterlyData={quarterlyDemurrage}
                    accentColor="#0EA5E9"
                    lowerIsBetter={true}
                    unit="KUSD"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}

              {(activeTab === 'dashboard' || activeTab === 'incidentialCost') && (
                <div id="incidentialCost" className="kpi-detail-wrapper">
                  <KPISection
                    kpiKey="incidentialCost"
                    title="Logistics Cost Resin Consolidtion"
                    icon={Layers}
                    monthlyData={incidentialCostData}
                    quarterlyData={quarterlyIncidentialCost}
                    accentColor="#2563EB"
                    lowerIsBetter={true}
                    unit="%"
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                  />
                </div>
              )}
            </>
          )}
        </main>

        <footer className="dashboard-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span>Logistics KPI Dashboard — Prototype v1.1 | Homologated Analytics &amp; Integrity Engine | LG Electronics DXI</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
              background: dataSource === 'api' ? '#16a34a' : '#d97706',
              color: '#fff', fontWeight: 600, letterSpacing: '0.02em',
            }}>
              {dataSource === 'api' ? '● API' : '● MOCK'}
            </span>
            <button
              onClick={loadFromApi}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                color: 'inherit', borderRadius: '6px', padding: '2px 10px',
                cursor: 'pointer', fontSize: '0.75rem',
              }}
              title="Reload API data"
            >
              ↻ Reload
            </button>
          </span>
        </footer>
      </div>

      {/* Metrics Explanation Modal */}
      <MetricsModal isOpen={isMetricsModalOpen} onClose={() => setIsMetricsModalOpen(false)} />
    </div>
  );
}

export default App;
