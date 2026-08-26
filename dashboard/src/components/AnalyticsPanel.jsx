import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Activity,
  History,
  Trash2,
  FlaskConical,
  X,
  ShieldCheck,
  TrendingUp,
  Calendar,
  ArrowRightLeft
} from 'lucide-react';
import { calculateYearlyStats } from '../utils/analyticsEngine';

export default function AnalyticsPanel({
  alerts = [],
  auditLog = [],
  configs = {},
  datasets = {},
  availableYears = ['Y25', 'Y26'],
  selectedYear = 'Y26',
  onSelectYear,
  onUpdateConfig,
  onRestoreDefaults,
  onRunAnalysis,
  onInjectErrors,
  onVerifyAlert,
  onDismissAlert,
  onClearAuditLog,
  isAnalyzing = false,
  totalRecordsChecked = 0,
}) {
  const [activeTab, setActiveTab] = useState('active-alerts'); // 'active-alerts' | 'configs' | 'audit'
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterKpi, setFilterKpi] = useState('all');
  
  // Ano Base e Ano de Comparação selecionados no Analytics
  const [analysisYear, setAnalysisYear] = useState(selectedYear || 'Y26'); // 'all' | 'Y25' | 'Y26'
  const [comparisonYear, setComparisonYear] = useState(() => {
    const prev = availableYears.find(y => y !== (selectedYear || 'Y26'));
    return prev || 'Y25';
  });
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Manipulação da mudança de ano de análise
  const handleYearChange = (newYear) => {
    setAnalysisYear(newYear);
    if (onSelectYear && newYear !== 'all') {
      onSelectYear(newYear);
    }
  };

  // Estatísticas calculadas para o ano base
  const baseStats = useMemo(() => {
    return calculateYearlyStats(datasets, alerts, analysisYear);
  }, [datasets, alerts, analysisYear]);

  // Estatísticas calculadas para o ano de comparação
  const compStats = useMemo(() => {
    if (!isCompareMode || comparisonYear === 'none') return null;
    return calculateYearlyStats(datasets, alerts, comparisonYear);
  }, [datasets, alerts, comparisonYear, isCompareMode]);

  // Contadores ativos
  const currentTotalChecked = analysisYear === 'all' ? totalRecordsChecked : baseStats.recordCount;
  const currentInconsistencyCount = baseStats.inconsistencyCount;
  const currentIntegrityScore = baseStats.integrityScore;
  const currentHighAlerts = baseStats.highCount;
  const currentAnomalies = baseStats.anomalyCount;

  // Filtragem dos alertas da tabela
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Filtro por Ano
      if (analysisYear !== 'all') {
        const isMatch = alert.year === analysisYear || alert.period?.includes(analysisYear.replace('Y', '20'));
        if (!isMatch) return false;
      }
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      if (filterType !== 'all' && alert.type !== filterType) return false;
      if (filterKpi !== 'all' && alert.kpiKey !== filterKpi) return false;
      return true;
    });
  }, [alerts, analysisYear, filterSeverity, filterType, filterKpi]);

  const getSeverityClass = (severity) => {
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  const getSeverityLabel = (severity) => {
    if (severity === 'high') return 'Critical';
    if (severity === 'medium') return 'Moderate';
    return 'Low';
  };

  const getSubtypeLabel = (subtype) => {
    switch (subtype) {
      case 'missing': return 'Missing Data';
      case 'out_of_bounds': return 'Out of Bounds';
      case 'duplicate': return 'Duplicate';
      case 'conflict': return 'Calculation Conflict';
      case 'zscore': return 'Statistical Deviation';
      case 'mom_variation': return 'Abrupt Fluctuation';
      default: return subtype;
    }
  };

  const formatYearLabel = (y) => {
    if (!y || y === 'all') return 'All Years';
    return `20${y.replace('Y', '')}`;
  };

  return (
    <div className="analytics-panel animate-fade-in">
      {/* Top Banner Information & Main Controls */}
      <div className="analytics-header-card">
        <div className="analytics-header-card__info">
          <h2>Integrated Analytics & Audit Panel</h2>
          <p>
            Continuous validation of data integrity and mathematical consistency across historical logistics KPIs. Automated identification of atypical spikes and pattern breaks.
          </p>
        </div>
        <div className="analytics-header-card__actions">
          <button 
            className={`btn btn--accent ${isAnalyzing ? 'btn--loading' : ''}`} 
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis Now'}
          </button>
          
          <button 
            className="btn btn--secondary" 
            onClick={onInjectErrors}
            title="Simulate artificial noise (null data, freight spikes, conflicts) to test alerts"
          >
            <FlaskConical size={14} />
            Simulate Inconsistencies
          </button>
        </div>
      </div>

      {/* Integrated Year Selection & Comparison Toolbar */}
      <div className="analytics-year-toolbar">
        <div className="analytics-year-toolbar__left">
          <div className="analytics-year-selector-item">
            <div className="toolbar-label">
              <Calendar size={13} className="text-accent" />
              <span>Analysis Year:</span>
            </div>
            <select 
              className="analytics-year-select"
              value={analysisYear}
              onChange={(e) => handleYearChange(e.target.value)}
            >
              <option value="all">Full History (All Years)</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Fiscal Year 20{y.replace('Y', '')} ({y})
                </option>
              ))}
            </select>
          </div>

          {analysisYear !== 'all' && (
            <div className="analytics-year-comparator-group animate-fade-in">
              <button 
                type="button"
                className={`btn btn--sm ${isCompareMode ? 'btn--accent' : 'btn--secondary'}`}
                onClick={() => setIsCompareMode(!isCompareMode)}
                title="Activate comparison of integrity and anomalies with another fiscal year"
              >
                <ArrowRightLeft size={12} />
                {isCompareMode ? 'Comparative Mode Active' : 'Compare with another Year'}
              </button>

              {isCompareMode && (
                <div className="comparison-year-picker animate-fade-in">
                  <span className="comparison-connector">vs</span>
                  <select
                    className="analytics-year-select"
                    value={comparisonYear}
                    onChange={(e) => setComparisonYear(e.target.value)}
                  >
                    {availableYears
                      .filter(y => y !== analysisYear)
                      .map((y) => (
                        <option key={y} value={y}>
                          20{y.replace('Y', '')} ({y})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="analytics-year-toolbar__right">
          <span className="analytics-status-pill">
            <span className="status-dot"></span>
            Focused Year: <strong>{formatYearLabel(analysisYear)}</strong>
            {isCompareMode && compStats && (
              <span className="vs-tag"> vs <strong>{formatYearLabel(comparisonYear)}</strong></span>
            )}
          </span>
        </div>
      </div>

      {/* Integrity Summary Grid */}
      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-success">
            {currentIntegrityScore > 90 ? <ShieldCheck size={24} /> : <AlertTriangle size={24} className="text-warning" />}
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Data Integrity</span>
            <div className="analytics-stat-card__val-row">
              <strong className="analytics-stat-card__value">
                {currentIntegrityScore.toFixed(1)}%
              </strong>
              {isCompareMode && compStats && (
                <span className={`comp-delta-badge ${currentIntegrityScore >= compStats.integrityScore ? 'positive' : 'negative'}`}>
                  {currentIntegrityScore >= compStats.integrityScore ? '▲' : '▼'}
                  {Math.abs(currentIntegrityScore - compStats.integrityScore).toFixed(1)}% vs {formatYearLabel(comparisonYear)}
                </span>
              )}
            </div>
            <span className="analytics-stat-card__hint">
              {currentInconsistencyCount} of {currentTotalChecked} data points with inconsistencies
              {isCompareMode && compStats && ` (vs ${compStats.inconsistencyCount} in ${formatYearLabel(comparisonYear)})`}
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-danger">
            <AlertTriangle size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Critical Alerts</span>
            <div className="analytics-stat-card__val-row">
              <strong className="analytics-stat-card__value text-danger">
                {currentHighAlerts}
              </strong>
              {isCompareMode && compStats && (
                <span className={`comp-delta-badge ${currentHighAlerts <= compStats.highCount ? 'positive' : 'negative'}`}>
                  {currentHighAlerts <= compStats.highCount ? '▼' : '▲'}
                  {Math.abs(currentHighAlerts - compStats.highCount)} vs {formatYearLabel(comparisonYear)}
                </span>
              )}
            </div>
            <span className="analytics-stat-card__hint">
              Require urgent manual verification
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-warning">
            <Activity size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Atypical Fluctuation</span>
            <div className="analytics-stat-card__val-row">
              <strong className="analytics-stat-card__value text-warning">
                {currentAnomalies}
              </strong>
              {isCompareMode && compStats && (
                <span className={`comp-delta-badge ${currentAnomalies <= compStats.anomalyCount ? 'positive' : 'negative'}`}>
                  {currentAnomalies <= compStats.anomalyCount ? '▼' : '▲'}
                  {Math.abs(currentAnomalies - compStats.anomalyCount)} vs {formatYearLabel(comparisonYear)}
                </span>
              )}
            </div>
            <span className="analytics-stat-card__hint">
              Statistical deviations from MoM / Z-Score patterns
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-info">
            <Database size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Total Records Checked</span>
            <div className="analytics-stat-card__val-row">
              <strong className="analytics-stat-card__value">
                {currentTotalChecked}
              </strong>
              {isCompareMode && compStats && (
                <span className="comp-delta-badge neutral">
                  {compStats.recordCount} in {formatYearLabel(comparisonYear)}
                </span>
              )}
            </div>
            <span className="analytics-stat-card__hint">
              {analysisYear === 'all' ? 'Consolidated historical database' : `Records for ${formatYearLabel(analysisYear)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button 
            className={`analytics-tab ${activeTab === 'active-alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('active-alerts')}
          >
            <AlertTriangle size={14} />
            Active Alerts
            {filteredAlerts.length > 0 && <span className="tab-badge">{filteredAlerts.length}</span>}
          </button>
          <button 
            className={`analytics-tab ${activeTab === 'configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('configs')}
          >
            <Sliders size={14} />
            Parameters & Limits
          </button>
          <button 
            className={`analytics-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={14} />
            Audit Logs
            {auditLog.length > 0 && <span className="tab-badge gray">{auditLog.length}</span>}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="analytics-tab-content">
        
        {/* Tab 1: Active Alerts */}
        {activeTab === 'active-alerts' && (
          <div className="tab-pane animate-fade-in">
            {/* Alert Filter Bar */}
            <div className="alerts-filter-bar">
              <div className="filter-group">
                <label>KPI:</label>
                <select value={filterKpi} onChange={(e) => setFilterKpi(e.target.value)}>
                  <option value="all">All Indicators</option>
                  <option value="logisticCost">Logistic Cost KPI TV</option>
                  <option value="airFreight">Air Freight KPI TV</option>
                  <option value="logisticsVsProd">Cost x Product Ratio</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Type:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="inconsistency">Inconsistencies (Errors)</option>
                  <option value="anomaly">Atypical Fluctuation</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Severity:</label>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="all">All Severities</option>
                  <option value="high">Critical</option>
                  <option value="medium">Moderate</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Year:</label>
                <select value={analysisYear} onChange={(e) => handleYearChange(e.target.value)}>
                  <option value="all">All Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>20{y.replace('Y', '')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alert Table */}
            {filteredAlerts.length === 0 ? (
              <div className="alerts-empty-state">
                <CheckCircle2 size={48} className="text-success animate-pulse" />
                <h3>No Alerts Found</h3>
                <p>
                  {alerts.length === 0 
                    ? 'Congratulations! All historical KPI data is consistent and free of anomalies.' 
                    : `No pending alerts for selected filter (${formatYearLabel(analysisYear)}).`}
                </p>
              </div>
            ) : (
              <div className="alerts-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>Period / Year</th>
                      <th>Severity</th>
                      <th>Subtype</th>
                      <th>Visual Alert / Message</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className={`alert-row severity-${alert.severity}`}>
                        <td className="cell-kpi-name">
                          <strong>{alert.kpiName}</strong>
                        </td>
                        <td>
                          <div className="period-badge-container">
                            <span className="badge-period">{alert.period}</span>
                            {alert.year && (
                              <span className="badge-year-tag">20{alert.year.replace('Y', '')}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`severity-badge ${getSeverityClass(alert.severity)}`}>
                            {getSeverityLabel(alert.severity)}
                          </span>
                        </td>
                        <td>
                          <span className="badge-type">{getSubtypeLabel(alert.subtype)}</span>
                        </td>
                        <td className="cell-message-text">
                          <div className="message-container">
                            <span className="main-message">
                              <AlertTriangle size={12} className="inline-icon" />
                              {alert.message}
                            </span>
                            <span className="sub-details">{alert.details}</span>
                          </div>
                        </td>
                        <td className="text-right cell-actions">
                          <button 
                            className="btn btn--sm btn--success" 
                            onClick={() => onVerifyAlert(alert.id)}
                            title="Mark as verified and include in audits"
                          >
                            <CheckCircle2 size={12} />
                            Verified
                          </button>
                          <button 
                            className="btn btn--sm btn--icon" 
                            onClick={() => onDismissAlert(alert.id)}
                            title="Dismiss alert"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Configurations & Parameters */}
        {activeTab === 'configs' && (
          <div className="tab-pane animate-fade-in">
            <div className="configs-grid">
              
              {/* Global Config Block */}
              <div className="config-card">
                <div className="config-card__header">
                  <Sliders size={16} className="text-accent" />
                  <h4>Global Statistical Parameters</h4>
                </div>
                <div className="config-card__body">
                  <p className="config-hint-text">
                    These values control the statistical tolerance level of the fluctuation detection engine across all historical series.
                  </p>
                  
                  <div className="input-group">
                    <div className="input-label-container">
                      <label>Z-Score Limit (Standard Deviation)</label>
                      <span className="input-badge">Current: {configs.logisticCost?.zScoreThreshold}σ</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.5" 
                      max="3.5" 
                      step="0.1" 
                      value={configs.logisticCost?.zScoreThreshold || 2.0} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateConfig('logisticCost', 'zScoreThreshold', val);
                        onUpdateConfig('airFreight', 'zScoreThreshold', val);
                        onUpdateConfig('logisticsVsProd', 'zScoreThreshold', val);
                      }}
                    />
                    <div className="range-labels">
                      <span>More Sensitive (1.5)</span>
                      <span>More Tolerant (3.5)</span>
                    </div>
                    <span className="input-desc">
                      Number of standard deviations outside the historical mean. Values above this trigger statistical anomaly alerts.
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual KPI Config Blocks */}
              {Object.keys(configs).map((kpiKey) => {
                const kpiConfig = configs[kpiKey];
                const isRatio = kpiKey === 'logisticsVsProd';
                const labelName = kpiKey === 'logisticCost' ? 'Logistic Cost KPI TV' : kpiKey === 'airFreight' ? 'Air Freight KPI TV' : 'Cost x Product Ratio';
                
                return (
                  <div className="config-card" key={kpiKey}>
                    <div className="config-card__header">
                      {isRatio ? <TrendingUp size={16} className="text-success" /> : <Activity size={16} className="text-accent" />}
                      <h4>Settings — {labelName}</h4>
                    </div>
                    <div className="config-card__body">
                      <div className="form-grid-2">
                        <div className="input-group">
                          <label>Acceptable Ceiling (Max)</label>
                          <input 
                            type="number" 
                            step={isRatio ? "0.005" : "0.01"}
                            value={kpiConfig.max}
                            onChange={(e) => onUpdateConfig(kpiKey, 'max', parseFloat(e.target.value) || 0)}
                          />
                          <span className="input-desc">Values above this trigger operational ceiling inconsistency.</span>
                        </div>

                        <div className="input-group">
                          <label>Monthly Variation Limit (MoM %)</label>
                          <input 
                            type="number" 
                            step="5"
                            value={kpiConfig.momThreshold}
                            onChange={(e) => onUpdateConfig(kpiKey, 'momThreshold', parseFloat(e.target.value) || 0)}
                          />
                          <span className="input-desc">Tolerated abrupt percentage variation from one month to another.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="config-actions-footer">
              <button className="btn btn--secondary" onClick={onRestoreDefaults}>
                Restore Factory Defaults
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Audit Log History */}
        {activeTab === 'audit' && (
          <div className="tab-pane animate-fade-in">
            <div className="audit-log-header">
              <h4>Audit & Event Logs</h4>
              {auditLog.length > 0 && (
                <button className="btn btn--sm btn--danger-outline" onClick={onClearAuditLog}>
                  <Trash2 size={12} />
                  Clear Logs
                </button>
              )}
            </div>

            {auditLog.length === 0 ? (
              <div className="audit-empty-state">
                <History size={36} className="text-dim" />
                <p>No audit logs recorded in system.</p>
              </div>
            ) : (
              <div className="audit-timeline">
                {auditLog.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

                  return (
                    <div className="audit-timeline-item" key={log.id}>
                      <div className="audit-timeline-badge"></div>
                      <div className="audit-timeline-content">
                        <div className="audit-timeline-header">
                          <span className="audit-action-title">{log.action}</span>
                          <span className="audit-time">{dateStr} at {timeStr}</span>
                        </div>
                        <p className="audit-details">{log.details}</p>
                        <span className="audit-user">Operator: {log.user}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
