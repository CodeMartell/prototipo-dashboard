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
import { DollarSign, Plane, Package, Calendar, AlertTriangle, TrendingDown, Anchor, Layers } from 'lucide-react';
import { fetchDashboardData, getCurrentUser, logout, UnauthorizedError } from './services/api';
import { canAccessAnalytics } from './services/permissions';

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

/**
 * Analytics ainda nao foi liberado para uso. Com a flag em false o item da
 * sidebar aparece bloqueado como "Soon", o painel nunca e renderizado e as
 * superficies que dependem dele (alertas, sino de notificacoes) ficam ocultas.
 * Para reativar tudo, basta voltar a flag para true.
 */
const ANALYTICS_ENABLED = false;

/* Periodo inicial do dashboard = periodo corrente do calendario. */
const TODAY = new Date();
const CURRENT_MONTH = MONTHS[TODAY.getMonth()];
const CURRENT_QUARTER = `Q${Math.floor(TODAY.getMonth() / 3) + 1}`;
const CURRENT_HALF = TODAY.getMonth() < 6 ? 'H1' : 'H2';
const CURRENT_YEAR_KEY = `Y${String(TODAY.getFullYear()).slice(-2)}`;

function App() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getCurrentUser());
  const isAnalyticsAllowed = useMemo(
    () => ANALYTICS_ENABLED && canAccessAnalytics(currentUser),
    [currentUser]
  );

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR_KEY);
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  const [selectedSubPeriod, setSelectedSubPeriod] = useState(CURRENT_MONTH); // 'Jan'..'Dec', 'Q1'..'Q4', 'H1'..'H2', 'Y26'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  // Mocks são permitidos apenas em desenvolvimento ou quando habilitados
  // explicitamente. Em produção, falha da API nunca pode parecer dado real.
  const allowMockFallback = import.meta.env.DEV || import.meta.env.VITE_ALLOW_MOCK_FALLBACK === 'true';
  const [logisticCostState, setLogisticCostState] = useState(() => allowMockFallback ? logisticCostData : []);
  const [airFreightState, setAirFreightState] = useState(() => allowMockFallback ? airFreightData : []);
  const [logisticsVsProdState, setLogisticsVsProdState] = useState(() => allowMockFallback ? logisticsCostVsProdData : []);

  // Indicates data source of currently displayed metrics
  const [dataSource, setDataSource] = useState(allowMockFallback ? 'mock' : 'loading');

  // --- LOADING API DATA ---
  const loadFromApi = useCallback(() => {
    fetchDashboardData()
      .then((data) => {
        setLogisticCostState(data.logistic_cost || []);
        setAirFreightState(data.air_freight || []);
        setLogisticsVsProdState(data.logistics_vs_prod || []);
        setDataSource('api');
        console.info('[DataLens] Data loaded from API successfully.');
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate('/login');
          return;
        }
        if (allowMockFallback) {
          console.warn('[DataLens] API unavailable, using explicitly allowed mock data:', err.message);
          setDataSource('mock');
        } else {
          setLogisticCostState([]);
          setAirFreightState([]);
          setLogisticsVsProdState([]);
          setDataSource('error');
          console.error('[DataLens] API unavailable; production data was not replaced by mocks:', err.message);
        }
      });
  }, [allowMockFallback, navigate]);

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
  // Enquanto Analytics estiver bloqueado, nenhum alerta e exposto: todos os
  // avisos levam ao painel de Analytics, que ainda nao esta disponivel.
  const activeAlerts = useMemo(
    () => (isAnalyticsAllowed ? alerts.filter(a => !a.verified) : []),
    [alerts, isAnalyticsAllowed]
  );
  
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
    if (newPeriod === 'monthly') setSelectedSubPeriod(CURRENT_MONTH);
    else if (newPeriod === 'quarterly') setSelectedSubPeriod(CURRENT_QUARTER);
    else if (newPeriod === 'semiannual') setSelectedSubPeriod(CURRENT_HALF);
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
    { key: 'logisticCost', name: 'War Room Report', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#3B82F6', monthly: logisticCostState, quarterly: quarterlyLogisticCost, description: 'Logistics cost over revenue' },
    { key: 'incidentialCost', name: 'Logistics Cost Resin Consolidtion', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#2563EB', monthly: incidentialCostData, quarterly: quarterlyIncidentialCost, description: 'Incidential costs over revenue' },
    { key: 'totalCost', name: 'Task Cost Reduction', unit: 'MUSD', aggregate: 'sum', valueKey: 'result', color: '#1D4ED8', monthly: totalCostData, quarterly: quarterlyTotalCost, description: 'Total logistics cost' },
    { key: 'demurrage', name: 'Demurrage Cost', unit: 'KUSD', aggregate: 'sum', valueKey: 'result', color: '#0EA5E9', monthly: demurrageData, quarterly: quarterlyDemurrage, description: 'Container demurrage' },
    { key: 'airFreight', name: 'Air Freight', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#38BDF8', monthly: airFreightState, quarterly: quarterlyAirFreight, description: 'Air freight over revenue' },
    { key: 'logisticsVsProd', name: 'Logistics Cost x Prod Amount', unit: 'Ratio', aggregate: 'avg', valueKey: 'ratio', color: '#7C3AED', monthly: logisticsVsProdState, quarterly: quarterlyLogisticsCostVsProd, description: 'Cost vs production ratio' },
  ], [logisticCostState, airFreightState, logisticsVsProdState]);

  const kpiMetrics = useMemo(
    () =>
      KPI_DEFINITIONS.map((def) => ({
        ...def,
        lowerIsBetter: true,
        ...getSubPeriodMetric(def.monthly, def.quarterly, def.valueKey, def.aggregate),
      })),
    [KPI_DEFINITIONS, getSubPeriodMetric]
  );

  const handleSidebarNavigate = (itemId) => {
    // Analytics bloqueado: clique nao muda de aba enquanto a feature nao sair.
    if (itemId === 'analytics' && !isAnalyticsAllowed) return;

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
        canAccessAnalytics={isAnalyticsAllowed}
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
          canAccessAnalytics={isAnalyticsAllowed}
        />

        <main className="dashboard-main">
          {activeTab === 'analytics' && isAnalyticsAllowed ? (
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
                    onClick={() => handleSidebarNavigate(m.key)}
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
              {isAnalyticsAllowed && activeAlerts.length > 0 && (
                <div className="global-warning-banner animate-fade-in">
                  <AlertTriangle size={18} className="text-warning" />
                  <div className="global-warning-banner__text">
                    <strong>Data Quality Alert:</strong> Analysis engine detected {activeAlerts.length} inconsistency(ies) or anomalous fluctuation(s) in historical KPI database.
                  </div>
                  <button className="btn btn--sm btn--primary" onClick={() => handleSidebarNavigate('analytics')}>
                    Review in Analytics
                  </button>
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
              {activeTab === 'logisticCost' && (
                <div id="logisticCost" className="kpi-detail-wrapper">
                  {lcAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {lcAlerts.length} alert(s) in historical data. Latest critical record in <strong>{lcAlerts[0].period}</strong>: {lcAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => handleSidebarNavigate('analytics')}>
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

              {activeTab === 'airFreight' && (
                <div id="airFreight" className="kpi-detail-wrapper">
                  {afAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {afAlerts.length} alert(s) in historical data. Latest critical record in <strong>{afAlerts[0].period}</strong>: {afAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => handleSidebarNavigate('analytics')}>
                        Audit Record
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="airFreight"
                    title="Air Freight"
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

              {activeTab === 'logisticsVsProd' && (
                <div id="logisticsVsProd" className="kpi-detail-wrapper">
                  {lpAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {lpAlerts.length} alert(s) in historical data. Latest critical record in <strong>{lpAlerts[0].period}</strong>: {lpAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => handleSidebarNavigate('analytics')}>
                        Audit Record
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="logisticsVsProd"
                    title="Logistics Cost x Prod Amount"
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

              {activeTab === 'totalCost' && (
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

              {activeTab === 'demurrage' && (
                <div id="demurrage" className="kpi-detail-wrapper">
                  <KPISection
                    kpiKey="demurrage"
                    title="Demurrage Cost"
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

              {activeTab === 'incidentialCost' && (
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
              background: dataSource === 'api' ? '#16a34a' : dataSource === 'error' ? '#dc2626' : '#d97706',
              color: '#fff', fontWeight: 600, letterSpacing: '0.02em',
            }}>
              {dataSource === 'api' ? '● API' : dataSource === 'error' ? '● API OFFLINE' : dataSource === 'loading' ? '● LOADING' : '● MOCK'}
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
