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
import { DollarSign, Plane, Package, Calendar, Lightbulb, AlertTriangle } from 'lucide-react';
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

  const [selectedYear, setSelectedYear] = useState('Y26');
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  const [selectedSubPeriod, setSelectedSubPeriod] = useState('May'); // 'Jan'..'Dec', 'Q1'..'Q4', 'H1'..'H2', 'Y26'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  // --- ESTADOS DO MOTOR DE ANALYTICS ---
  // Iniciados com mocks; substituídos pelos dados da API quando disponível.
  const [logisticCostState, setLogisticCostState] = useState(logisticCostData);
  const [airFreightState, setAirFreightState] = useState(airFreightData);
  const [logisticsVsProdState, setLogisticsVsProdState] = useState(logisticsCostVsProdData);

  // Indica a origem dos dados atualmente exibidos
  const [dataSource, setDataSource] = useState('mock'); // 'mock' | 'api'

  // --- CARREGAMENTO DE DADOS DA API ---
  const loadFromApi = useCallback(() => {
    fetchDashboardData()
      .then((data) => {
        if (data.logistic_cost?.length) setLogisticCostState(data.logistic_cost);
        if (data.air_freight?.length) setAirFreightState(data.air_freight);
        if (data.logistics_vs_prod?.length) setLogisticsVsProdState(data.logistics_vs_prod);
        setDataSource('api');
        console.info('[DataLens] Dados carregados da API com sucesso.');
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate('/login');
          return;
        }
        // Tabela ainda não populada pelo bot de extração, API fora do ar,
        // etc — mantém a tela funcional com dado mock em vez de quebrar.
        console.warn('[DataLens] API indisponível, usando dados mock:', err.message);
        setDataSource('mock');
      });
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [navigate]);

  // Carrega dados da API ao montar o componente
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
        action: 'Sistema Inicializado',
        details: 'Motor de análise de consistência e anomalias ativado.',
        timestamp: new Date().toISOString(),
        user: 'Sistema'
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

  // Executar a análise de dados
  const runAnalysis = () => {
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
  };

  // Re-analisa se dados ou regras mudarem
  useEffect(() => {
    runAnalysis();
  }, [logisticCostState, airFreightState, logisticsVsProdState, configs]);

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
        action: 'Análise Executada',
        details: `Varredura sob demanda concluída. ${results.length} irregularidades identificadas na base histórica.`,
        timestamp: new Date().toISOString(),
        user: 'Logística & Admin'
      };
      setAuditLog(prev => [newLog, ...prev]);
    }, 800);
  };

  const handleInjectErrors = () => {
    // 1. Custo Logístico: nulo em Nov/Y25 e estouro May/Y26
    const newLogCost = logisticCostState.map(d => {
      if (d.month === 'Nov' && d.year === 'Y25') {
        return { ...d, result: null };
      }
      if (d.month === 'May' && d.year === 'Y26') {
        return { ...d, result: 0.165 }; // 16.5% (>8.0% max)
      }
      return d;
    });

    // 2. Air Freight: pico extremo Jan/Y26 e duplicata em Jun/Y26
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

    // 3. Ratio: conflito matemático em Nov/Y26
    const newLogVsProd = logisticsVsProdState.map(d => {
      if (d.month === 'Nov' && d.year === 'Y26') {
        return { ...d, ratio: 0.0850 }; // Custo 1.30 / Produção 27.08 != 0.0850
      }
      return d;
    });

    // Limpar estados locais de descartados para que os alertas reapareçam
    localStorage.setItem('analytics_dismissed_alerts', '[]');
    localStorage.setItem('analytics_verified_alerts', '[]');

    setLogisticCostState(newLogCost);
    setAirFreightState(newAirFreight);
    setLogisticsVsProdState(newLogVsProd);

    const newLog = {
      id: `log-${Date.now()}`,
      action: 'Injeção de Erros',
      details: 'Inconsistências artificiais injetadas no banco de dados para validação operacional do sistema.',
      timestamp: new Date().toISOString(),
      user: 'Logística & Admin'
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
      action: 'Alerta Verificado',
      details: `Verificação efetuada: ${alert.kpiName} (${alert.period}) - ${alert.message}`,
      timestamp: new Date().toISOString(),
      user: 'Logística & Admin'
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
      action: 'Alerta Descartado',
      details: `Descarte efetuado pelo operador: ${alert.kpiName} (${alert.period}) - ${alert.message}`,
      timestamp: new Date().toISOString(),
      user: 'Logística & Admin'
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
      action: 'Padrões Restaurados',
      details: 'Parâmetros de fábrica e base de dados original recarregados com sucesso.',
      timestamp: new Date().toISOString(),
      user: 'Logística & Admin'
    };
    setAuditLog(prev => [newLog, ...prev]);
  };

  const handleClearAuditLog = () => {
    setAuditLog([]);
  };

  // --- FILTROS DE ALERTA PARA BADGES E INTERFACE ---
  const activeAlerts = useMemo(() => alerts.filter(a => !a.verified), [alerts]);
  
  const kpisWithAlerts = useMemo(() => {
    return Array.from(new Set(activeAlerts.map(a => a.kpiKey)));
  }, [activeAlerts]);

  const totalRecordsChecked = logisticCostState.length + airFreightState.length + logisticsVsProdState.length;

  const prevYear = `Y${parseInt(selectedYear.substring(1)) - 1}`;
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${prevYear.substring(1)}`;

  // Reset do subperíodo ao mudar o tipo
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'monthly') setSelectedSubPeriod('May');
    else if (newPeriod === 'quarterly') setSelectedSubPeriod('Q1');
    else if (newPeriod === 'semiannual') setSelectedSubPeriod('H1');
    else setSelectedSubPeriod(selectedYear);
  };

  // Agrega uma lista de registros de um campo (média para taxas, soma para valores absolutos)
  const aggregateField = (rows, field, mode) => {
    const valid = rows.filter((d) => d[field] !== null && d[field] !== undefined);
    if (!valid.length) return null;
    const total = valid.reduce((s, d) => s + d[field], 0);
    return mode === 'sum' ? total : total / valid.length;
  };

  // Seleciona os registros do período ativo (mês, trimestre, semestre ou ano) para um determinado ano
  const selectPeriodRows = (monthlyArr, quarterlyArr, year) => {
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
  };

  // Calcula realizado, meta e atingimento de um ano específico no período ativo
  const getPeriodStats = (monthlyArr, quarterlyArr, year, valueKey, aggregate) => {
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
  };

  // Helper: métricas completas (atual + período anterior) para o período selecionado
  const getSubPeriodMetric = (monthlyArr, quarterlyArr, valueKey = 'result', aggregate = 'avg') => {
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

    // Sparkline com a série mensal do ano selecionado
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
  };

  // Definição dos indicadores exibidos nos cards e na matriz comparativa
  const KPI_DEFINITIONS = [
    { key: 'warRoom', name: 'War Room', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#3B82F6', monthly: logisticCostState, quarterly: quarterlyLogisticCost, description: 'Custo logístico sobre faturamento' },
    { key: 'incidentialCost', name: 'Incidential Cost', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#2563EB', monthly: incidentialCostData, quarterly: quarterlyIncidentialCost, description: 'Custos incidentais sobre faturamento' },
    { key: 'totalCost', name: 'Total Cost', unit: 'MUSD', aggregate: 'sum', valueKey: 'result', color: '#1D4ED8', monthly: totalCostData, quarterly: quarterlyTotalCost, description: 'Custo logístico total' },
    { key: 'demurrage', name: 'Demurrage', unit: 'KUSD', aggregate: 'sum', valueKey: 'result', color: '#0EA5E9', monthly: demurrageData, quarterly: quarterlyDemurrage, description: 'Sobrestadia de contêineres' },
    { key: 'airFreight', name: 'Air Freight', unit: '%', aggregate: 'avg', valueKey: 'result', color: '#38BDF8', monthly: airFreightState, quarterly: quarterlyAirFreight, description: 'Frete aéreo sobre faturamento' },
  ];

  const kpiMetrics = useMemo(
    () =>
      KPI_DEFINITIONS.map((def) => ({
        ...def,
        lowerIsBetter: true,
        ...getSubPeriodMetric(def.monthly, def.quarterly, def.valueKey, def.aggregate),
      })),
    [logisticCostState, airFreightState, selectedYear, period, selectedSubPeriod]
  );

  const logCostInfo = useMemo(
    () => getSubPeriodMetric(logisticCostState, quarterlyLogisticCost, 'result'),
    [logisticCostState, selectedYear, period, selectedSubPeriod]
  );

  const airFreightInfo = useMemo(
    () => getSubPeriodMetric(airFreightState, quarterlyAirFreight, 'result'),
    [airFreightState, selectedYear, period, selectedSubPeriod]
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

  const kpi3PrevTotals = useMemo(() => {
    const prevData = logisticsVsProdState.filter((d) => d.year === prevYear && d.ratio !== null);
    if (prevData.length === 0) return { totalCost: null, totalProd: null };

    let filtered = prevData;
    if (period === 'monthly') {
      const monthIdx = MONTHS.indexOf(selectedSubPeriod);
      if (monthIdx !== -1) {
        filtered = prevData.slice(0, monthIdx + 1);
      }
    }

    return {
      totalCost: filtered.reduce((s, d) => s + (d.logisticsCost || 0), 0),
      totalProd: filtered.reduce((s, d) => s + (d.productionAmount || 0), 0),
    };
  }, [logisticsVsProdState, selectedYear, prevYear, period, selectedSubPeriod]);

  const prodVariation = kpi3PrevTotals.totalProd ? calculateVariation(kpi3Latest.totalProd, kpi3PrevTotals.totalProd) : null;
  const costVariation = kpi3PrevTotals.totalCost ? calculateVariation(kpi3Latest.totalCost, kpi3PrevTotals.totalCost) : null;

  const handleSidebarNavigate = (itemId) => {
    setActiveTab(itemId);
    if (itemId === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (itemId !== 'analytics') {
      const elem = document.getElementById(itemId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Filtrar alertas para exibição inline por indicador
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
                    Filtro de Período & Agrupamento
                  </div>
                  <PeriodFilter
                    activePeriod={period}
                    onPeriodChange={handlePeriodChange}
                    selectedSubPeriod={selectedSubPeriod}
                    onSubPeriodChange={setSelectedSubPeriod}
                  />
                </div>
              </div>

              {/* Cards de Indicadores — variam conforme o período selecionado */}
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

              {/* Banner de aviso geral sobre inconsistências da base */}
              {activeAlerts.length > 0 && (
                <div className="global-warning-banner animate-fade-in">
                  <AlertTriangle size={18} className="text-warning" />
                  <div className="global-warning-banner__text">
                    <strong>Alerta de Qualidade de Dados:</strong> O motor de análise detectou {activeAlerts.length} inconsistência(s) ou oscilação(ões) anômala(s) na base histórica de KPIs.
                  </div>
                  <button className="btn btn--sm btn--primary" onClick={() => setActiveTab('analytics')}>
                    Revisar no Analytics
                  </button>
                </div>
              )}

              {/* Dynamic Insight Banner based on Active Sidebar View */}
              {activeTab !== 'dashboard' && activeTab !== 'analytics' && (
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
                        <strong>Validação de Dados:</strong> Detectado(s) {lcAlerts.length} alerta(s) no histórico. Último registro crítico em <strong>{lcAlerts[0].period}</strong>: {lcAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Auditar Registro
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="logisticCost"
                    title="Evolução do Custo Logístico (War Room Report)"
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
                        <strong>Validação de Dados:</strong> Detectado(s) {afAlerts.length} alerta(s) no histórico. Último registro crítico em <strong>{afAlerts[0].period}</strong>: {afAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Auditar Registro
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="airFreight"
                    title="Air Freight KPI TV"
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
                        <strong>Validação de Dados:</strong> Detectado(s) {lpAlerts.length} alerta(s) no histórico. Último registro crítico em <strong>{lpAlerts[0].period}</strong>: {lpAlerts[0].message}
                      </div>
                      <button className="btn btn--sm btn--accent" onClick={() => setActiveTab('analytics')}>
                        Auditar Registro
                      </button>
                    </div>
                  )}
                  <KPISection
                    kpiKey="logisticsVsProd"
                    title="Logistics Cost x Product Amount"
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
            </>
          )}
        </main>

        <footer className="dashboard-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span>Dashboard KPI Logístico — Protótipo v1.1 | Motor de Analytics &amp; Integridade Homologado | LG Electronics DXI</span>
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
              title="Recarregar dados da API"
            >
              ↻ Recarregar
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
