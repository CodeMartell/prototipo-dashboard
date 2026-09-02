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
import KpiEntryModal from './components/KpiEntryModal';
import { fetchDashboardData, getCurrentUser, logout, UnauthorizedError } from './services/api';
import { canAccessAnalytics, canEditKpiData } from './services/permissions';

import {
  MONTHS,
  aggregateField,
  buildQuarterlySeries,
  calculateVariation,
  getAvailableYears,
} from './utils/kpiData';

import { runFullAnalysis, getDefaultConfigs } from './utils/analyticsEngine';

/**
 * Definicao dos indicadores: nome, unidade, direcao e como agregar.
 * `dataKey` casa com a chave devolvida por GET /api/kpis/dashboard e
 * `key` e o id usado na sidebar e nas secoes de detalhe.
 */
const KPI_CATALOG = [
  {
    key: 'logisticCost',
    dataKey: 'logistic_cost',
    name: 'War Room Report',
    unit: '%',
    aggregate: 'avg',
    valueKey: 'result',
    lowerIsBetter: true,
    color: '#3B82F6',
    icon: DollarSign,
  },
  {
    key: 'incidentialCost',
    dataKey: 'incidental_cost',
    name: 'Logistics Cost Resin Consolidation',
    unit: 'KUSD',
    aggregate: 'sum',
    valueKey: 'result',
    lowerIsBetter: false, // saving: quanto maior, melhor
    color: '#2563EB',
    icon: Layers,
  },
  {
    key: 'totalCost',
    dataKey: 'total_cost',
    name: 'Task Cost Reduction',
    unit: 'KBRL',
    aggregate: 'sum',
    valueKey: 'result',
    lowerIsBetter: false, // reducao alcancada: quanto maior, melhor
    color: '#1D4ED8',
    icon: TrendingDown,
  },
  {
    key: 'demurrage',
    dataKey: 'demurrage',
    name: 'Demurrage Cost',
    unit: 'CTNR',
    aggregate: 'sum',
    valueKey: 'result',
    lowerIsBetter: true,
    color: '#0EA5E9',
    icon: Anchor,
  },
  {
    key: 'airFreight',
    dataKey: 'air_freight',
    name: 'Air Freight',
    unit: '%',
    aggregate: 'avg',
    valueKey: 'result',
    lowerIsBetter: true,
    color: '#38BDF8',
    icon: Plane,
  },
  {
    key: 'logisticsVsProd',
    dataKey: 'logistics_vs_prod',
    name: 'Logistics Cost x Prod Amount',
    unit: 'Ratio',
    aggregate: 'avg',
    valueKey: 'ratio',
    lowerIsBetter: true,
    color: '#7C3AED',
    icon: Package,
  },
];

const EMPTY_DATASETS = Object.freeze(
  KPI_CATALOG.reduce((acc, { dataKey }) => ({ ...acc, [dataKey]: [] }), {})
);

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
  const canEditData = useMemo(() => canEditKpiData(currentUser), [currentUser]);

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
  const [entryModalKpiKey, setEntryModalKpiKey] = useState(null);
  const [entryMonth, setEntryMonth] = useState(CURRENT_MONTH);

  // Séries mensais de todos os indicadores, sempre vindas da API.
  // Não existe mais fallback local: sem backend, o dashboard mostra vazio
  // em vez de números que parecem reais.
  const [datasets, setDatasets] = useState(EMPTY_DATASETS);
  const [dataSource, setDataSource] = useState('loading'); // 'loading' | 'api' | 'error'
  const [loadError, setLoadError] = useState(null);

  // --- LOADING API DATA ---
  const loadFromApi = useCallback(() => {
    setDataSource((prev) => (prev === 'api' ? prev : 'loading'));

    return fetchDashboardData()
      .then((data) => {
        setDatasets(
          KPI_CATALOG.reduce(
            (acc, { dataKey }) => ({ ...acc, [dataKey]: data[dataKey] || [] }),
            {}
          )
        );
        setDataSource('api');
        setLoadError(null);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate('/login');
          return;
        }
        setDatasets(EMPTY_DATASETS);
        setDataSource('error');
        setLoadError(err.message);
        console.error('[DataLens] API unavailable; dashboard rendered without data:', err.message);
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

  const availableYears = useMemo(() => getAvailableYears(datasets), [datasets]);

  // Datasets no formato que o motor de análise espera.
  const analysisDatasets = useMemo(
    () => ({
      logisticCost: datasets.logistic_cost,
      airFreight: datasets.air_freight,
      logisticsVsProd: datasets.logistics_vs_prod,
    }),
    [datasets]
  );

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
    const results = runFullAnalysis(analysisDatasets, configs);

    const dismissedIds = JSON.parse(localStorage.getItem('analytics_dismissed_alerts') || '[]');
    const verifiedIds = JSON.parse(localStorage.getItem('analytics_verified_alerts') || '[]');
    
    const processedAlerts = results.filter(r => !dismissedIds.includes(r.id)).map(r => ({
      ...r,
      verified: verifiedIds.includes(r.id)
    }));

    setAlerts(processedAlerts);
  }, [analysisDatasets, configs]);

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
      
      const results = runFullAnalysis(analysisDatasets, configs);

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
    // Restaura apenas os limites do motor de análise. Os dados vêm do
    // banco e não são substituídos por nada local.
    setConfigs(getDefaultConfigs());
    localStorage.setItem('analytics_dismissed_alerts', '[]');
    localStorage.setItem('analytics_verified_alerts', '[]');
    loadFromApi();

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Defaults Restored',
      details: 'Analysis thresholds reset to factory values and data reloaded from the API.',
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

  const totalRecordsChecked = useMemo(
    () => Object.values(datasets).reduce((total, rows) => total + (rows?.length || 0), 0),
    [datasets]
  );

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
  const getPeriodStats = useCallback((monthlyArr, quarterlyArr, year, valueKey, aggregate, lowerIsBetter) => {
    const isRatio = valueKey === 'ratio';
    const rows = selectPeriodRows(monthlyArr, quarterlyArr, year);

    const result = aggregateField(rows, valueKey, aggregate);
    const target = isRatio ? null : aggregateField(rows, 'target', aggregate);

    let achievement = null;
    if (!isRatio) {
      if (aggregate === 'sum') {
        // Séries somadas: recalcula do total, respeitando a direção do KPI.
        if (result !== null && target !== null) {
          const [numerator, denominator] = lowerIsBetter ? [target, result] : [result, target];
          achievement = denominator === 0 ? (numerator === 0 ? 1 : null) : numerator / denominator;
        }
      } else {
        achievement = aggregateField(rows, 'achievement', 'avg');
      }
    }

    return { result, target, achievement };
  }, [selectPeriodRows]);

  // Subperiod metrics helper
  const getSubPeriodMetric = useCallback((monthlyArr, quarterlyArr, valueKey = 'result', aggregate = 'avg', lowerIsBetter = true) => {
    const isAnnual = period === 'annual';
    const subLabel = isAnnual ? currentYearLabel : `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
    const prevSubLabel = isAnnual ? prevYearLabel : `${selectedSubPeriod}/${prevYearLabel.substring(2)}`;

    const current = getPeriodStats(monthlyArr, quarterlyArr, selectedYear, valueKey, aggregate, lowerIsBetter);
    const previous = getPeriodStats(monthlyArr, quarterlyArr, prevYear, valueKey, aggregate, lowerIsBetter);

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

  /**
   * Indicadores prontos para consumo: série mensal vem da API e a visão
   * trimestral (base de trimestre / semestre / ano) é derivada dela.
   */
  const kpiDefinitions = useMemo(
    () =>
      KPI_CATALOG.map((def) => {
        const monthly = datasets[def.dataKey] || [];
        return {
          ...def,
          monthly,
          quarterly: buildQuarterlySeries(monthly, {
            aggregate: def.aggregate,
            valueKey: def.valueKey,
            lowerIsBetter: def.lowerIsBetter,
          }),
        };
      }),
    [datasets]
  );

  const kpiMetrics = useMemo(
    () =>
      kpiDefinitions.map((def) => ({
        ...def,
        ...getSubPeriodMetric(def.monthly, def.quarterly, def.valueKey, def.aggregate, def.lowerIsBetter),
      })),
    [kpiDefinitions, getSubPeriodMetric]
  );

  const kpiByKey = useMemo(
    () => Object.fromEntries(kpiDefinitions.map((def) => [def.key, def])),
    [kpiDefinitions]
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

  // Indicador aberto no momento (null quando estamos no overview)
  const activeKpi = kpiByKey[activeTab] || null;

  // Alertas do indicador aberto, para o aviso inline da seção
  const activeKpiAlerts = useMemo(
    () => (activeKpi ? activeAlerts.filter((a) => a.kpiKey === activeKpi.key) : []),
    [activeAlerts, activeKpi]
  );

  /**
   * Abre o formulário de lançamento manual no mês que o usuário está
   * olhando: a seção manda o período em foco (que pode ter vindo de um
   * clique no gráfico); fora do agrupamento mensal, cai no mês corrente.
   */
  const openEntryModal = (kpiKey, focusedMonth) => {
    const candidates = [focusedMonth, selectedSubPeriod, CURRENT_MONTH];
    setEntryMonth(candidates.find((month) => MONTHS.includes(month)) || CURRENT_MONTH);
    setEntryModalKpiKey(kpiKey);
  };

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

              {/* Sem dados: deixa explícito que a origem é a API, não um mock */}
              {dataSource === 'error' && (
                <div className="global-warning-banner animate-fade-in">
                  <AlertTriangle size={18} className="text-warning" />
                  <div className="global-warning-banner__text">
                    <strong>No data loaded:</strong> the API did not respond
                    {loadError ? ` (${loadError})` : ''}. Nothing is displayed until the connection is restored.
                  </div>
                  <button className="btn btn--sm btn--primary" onClick={loadFromApi}>
                    Try again
                  </button>
                </div>
              )}

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

              {/* Detalhe do indicador selecionado — o overview nao abre nenhum */}
              {activeKpi && (
                <div id={activeKpi.key} className="kpi-detail-wrapper">
                  {activeKpiAlerts.length > 0 && (
                    <div className="kpi-inline-warning animate-fade-in">
                      <AlertTriangle size={14} className="text-warning" />
                      <div className="kpi-inline-warning__text">
                        <strong>Data Validation:</strong> Detected {activeKpiAlerts.length} alert(s) in historical data. Latest critical record in <strong>{activeKpiAlerts[0].period}</strong>: {activeKpiAlerts[0].message}
                      </div>
                    </div>
                  )}
                  <KPISection
                    kpiKey={activeKpi.key}
                    title={activeKpi.name}
                    icon={activeKpi.icon}
                    monthlyData={activeKpi.monthly}
                    quarterlyData={activeKpi.quarterly}
                    accentColor={activeKpi.color}
                    lowerIsBetter={activeKpi.lowerIsBetter}
                    unit={activeKpi.unit}
                    selectedYear={selectedYear}
                    period={period}
                    activePeriodLabel={selectedSubPeriod}
                    onEditData={canEditData ? (focusedMonth) => openEntryModal(activeKpi.key, focusedMonth) : undefined}
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
              {dataSource === 'api' ? '● API' : dataSource === 'error' ? '● API OFFLINE' : '● LOADING'}
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

      {/* Lançamento manual de valores do indicador */}
      <KpiEntryModal
        isOpen={Boolean(entryModalKpiKey)}
        kpi={kpiByKey[entryModalKpiKey] || null}
        years={availableYears}
        defaultYear={selectedYear}
        defaultMonth={entryMonth}
        onClose={() => setEntryModalKpiKey(null)}
        onSaved={loadFromApi}
      />
    </div>
  );
}

export default App;
