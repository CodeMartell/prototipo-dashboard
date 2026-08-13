import React, { useState } from 'react';
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
  Info,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { formatPercent } from '../utils/formatters';

export default function AnalyticsPanel({
  alerts = [],
  auditLog = [],
  configs = {},
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

  // Integridade de dados calculada: 100% se não houver alertas de inconsistência, proporcional ao total senão
  const inconsistencyCount = alerts.filter(a => a.type === 'inconsistency').length;
  const integrityScore = totalRecordsChecked > 0 
    ? Math.max(0, 100 - (inconsistencyCount / totalRecordsChecked) * 100) 
    : 100;

  // Contadores de alertas por gravidade
  const highAlerts = alerts.filter(a => a.severity === 'high').length;
  const mediumAlerts = alerts.filter(a => a.severity === 'medium').length;

  // Filtragem dos alertas ativos
  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (filterKpi !== 'all' && alert.kpiKey !== filterKpi) return false;
    return true;
  });

  const getSeverityClass = (severity) => {
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  const getSeverityLabel = (severity) => {
    if (severity === 'high') return 'Crítica';
    if (severity === 'medium') return 'Moderada';
    return 'Baixa';
  };

  const getSubtypeLabel = (subtype) => {
    switch (subtype) {
      case 'missing': return 'Dado Ausente';
      case 'out_of_bounds': return 'Fora do Limite';
      case 'duplicate': return 'Duplicidade';
      case 'conflict': return 'Conflito de Cálculo';
      case 'zscore': return 'Desvio Estatístico';
      case 'mom_variation': return 'Variação Abrupta';
      default: return subtype;
    }
  };

  return (
    <div className="analytics-panel animate-fade-in">
      {/* Top Banner de Informação e Controle Principal */}
      <div className="analytics-header-card">
        <div className="analytics-header-card__info">
          <h2>Painel Integrado de Analytics & Auditoria</h2>
          <p>
            Validação contínua da integridade e consistência matemática dos dados históricos dos KPIs logísticos. Identificação automática de picos atípicos e quebras de padrão.
          </p>
        </div>
        <div className="analytics-header-card__actions">
          <button 
            className={`btn btn--accent ${isAnalyzing ? 'btn--loading' : ''}`} 
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
          >
            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analisando...' : 'Analisar agora'}
          </button>
          
          <button 
            className="btn btn--secondary" 
            onClick={onInjectErrors}
            title="Injetar ruídos artificiais (dados nulos, picos de frete, conflitos) para testar os alertas"
          >
            <FlaskConical size={14} />
            Simular Inconsistências
          </button>
        </div>
      </div>

      {/* Grid de Resumo de Integridade */}
      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-success">
            {integrityScore > 90 ? <ShieldCheck size={24} /> : <AlertTriangle size={24} className="text-warning" />}
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Integridade dos Dados</span>
            <strong className="analytics-stat-card__value">
              {integrityScore.toFixed(1)}%
            </strong>
            <span className="analytics-stat-card__hint">
              {inconsistencyCount} de {totalRecordsChecked} pontos com inconsistências
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-danger">
            <AlertTriangle size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Alertas Críticos</span>
            <strong className="analytics-stat-card__value text-danger">
              {highAlerts}
            </strong>
            <span className="analytics-stat-card__hint">
              Requerem verificação manual urgente
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-warning">
            <Activity size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Oscilações Anômalas</span>
            <strong className="analytics-stat-card__value text-warning">
              {alerts.filter(a => a.type === 'anomaly').length}
            </strong>
            <span className="analytics-stat-card__hint">
              Desvios estatísticos do padrão MoM / Z-Score
            </span>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-card__icon text-info">
            <Database size={24} />
          </div>
          <div className="analytics-stat-card__data">
            <span className="analytics-stat-card__label">Total Analisado</span>
            <strong className="analytics-stat-card__value">
              {totalRecordsChecked}
            </strong>
            <span className="analytics-stat-card__hint">
              Registros históricos validados
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Internas */}
      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button 
            className={`analytics-tab ${activeTab === 'active-alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('active-alerts')}
          >
            <AlertTriangle size={14} />
            Alertas Ativos
            {alerts.length > 0 && <span className="tab-badge">{alerts.length}</span>}
          </button>
          <button 
            className={`analytics-tab ${activeTab === 'configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('configs')}
          >
            <Sliders size={14} />
            Parâmetros & Limites
          </button>
          <button 
            className={`analytics-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={14} />
            Histórico de Auditoria
            {auditLog.length > 0 && <span className="tab-badge gray">{auditLog.length}</span>}
          </button>
        </div>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="analytics-tab-content">
        
        {/* Tab 1: Alertas Ativos */}
        {activeTab === 'active-alerts' && (
          <div className="tab-pane animate-fade-in">
            {/* Filtros de Alerta */}
            <div className="alerts-filter-bar">
              <div className="filter-group">
                <label>KPI:</label>
                <select value={filterKpi} onChange={(e) => setFilterKpi(e.target.value)}>
                  <option value="all">Todos os Indicadores</option>
                  <option value="logisticCost">Logistic Cost KPI TV</option>
                  <option value="airFreight">Air Freight KPI TV</option>
                  <option value="logisticsVsProd">Cost x Product Ratio</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Tipo:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">Todos os Tipos</option>
                  <option value="inconsistency">Inconsistências (Erros)</option>
                  <option value="anomaly">Oscilações Anômalas</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Severidade:</label>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="all">Todas as Severidades</option>
                  <option value="high">Crítica</option>
                  <option value="medium">Moderada</option>
                </select>
              </div>
            </div>

            {/* Listagem de Alertas */}
            {filteredAlerts.length === 0 ? (
              <div className="alerts-empty-state">
                <CheckCircle2 size={48} className="text-success animate-pulse" />
                <h3>Nenhum Alerta Encontrado</h3>
                <p>
                  {alerts.length === 0 
                    ? 'Parabéns! Todos os dados históricos dos KPIs estão consistentes e livres de anomalias.' 
                    : 'Nenhum alerta corresponde aos filtros aplicados.'}
                </p>
              </div>
            ) : (
              <div className="alerts-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Período</th>
                      <th>Classificação</th>
                      <th>Subtipo</th>
                      <th>Alerta Visual / Mensagem</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className={`alert-row severity-${alert.severity}`}>
                        <td className="cell-kpi-name">
                          <strong>{alert.kpiName}</strong>
                        </td>
                        <td><span className="badge-period">{alert.period}</span></td>
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
                            title="Marcar como verificado e incluir nas auditorias"
                          >
                            <CheckCircle2 size={12} />
                            Verificado
                          </button>
                          <button 
                            className="btn btn--sm btn--icon" 
                            onClick={() => onDismissAlert(alert.id)}
                            title="Descartar alerta"
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

        {/* Tab 2: Configurações & Parâmetros */}
        {activeTab === 'configs' && (
          <div className="tab-pane animate-fade-in">
            <div className="configs-grid">
              
              {/* Bloco de Configuração Global */}
              <div className="config-card">
                <div className="config-card__header">
                  <Sliders size={16} className="text-accent" />
                  <h4>Parâmetros Estatísticos Globais</h4>
                </div>
                <div className="config-card__body">
                  <p className="config-hint-text">
                    Estes valores controlam o nível de tolerância estatística do motor de detecção de oscilações anômalas para todas as séries históricas.
                  </p>
                  
                  <div className="input-group">
                    <div className="input-label-container">
                      <label>Limite Z-Score (Desvio Padrão)</label>
                      <span className="input-badge">Atual: {configs.logisticCost?.zScoreThreshold}σ</span>
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
                      <span>Mais Sensível (1.5)</span>
                      <span>Mais Tolerante (3.5)</span>
                    </div>
                    <span className="input-desc">
                      Número de desvios padrões fora da média histórica. Valores acima disso geram alertas de anomalia estatística.
                    </span>
                  </div>
                </div>
              </div>

              {/* Blocos de Configurações Individuais dos KPIs */}
              {Object.keys(configs).map((kpiKey) => {
                const kpiConfig = configs[kpiKey];
                const isRatio = kpiKey === 'logisticsVsProd';
                const labelName = kpiKey === 'logisticCost' ? 'Logistic Cost KPI TV' : kpiKey === 'airFreight' ? 'Air Freight KPI TV' : 'Cost x Product Ratio';
                
                return (
                  <div className="config-card" key={kpiKey}>
                    <div className="config-card__header">
                      {isRatio ? <TrendingUp size={16} className="text-success" /> : <Activity size={16} className="text-accent" />}
                      <h4>Configurações — {labelName}</h4>
                    </div>
                    <div className="config-card__body">
                      <div className="form-grid-2">
                        <div className="input-group">
                          <label>Teto Aceitável (Max)</label>
                          <input 
                            type="number" 
                            step={isRatio ? "0.005" : "0.01"}
                            value={kpiConfig.max}
                            onChange={(e) => onUpdateConfig(kpiKey, 'max', parseFloat(e.target.value) || 0)}
                          />
                          <span className="input-desc">Valores acima disso geram inconsistência operacional de teto.</span>
                        </div>

                        <div className="input-group">
                          <label>Variação Mensal Limite (MoM %)</label>
                          <input 
                            type="number" 
                            step="5"
                            value={kpiConfig.momThreshold}
                            onChange={(e) => onUpdateConfig(kpiKey, 'momThreshold', parseFloat(e.target.value) || 0)}
                          />
                          <span className="input-desc">Variação percentual brusca tolerada de um mês para outro.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="config-actions-footer">
              <button className="btn btn--secondary" onClick={onRestoreDefaults}>
                Restaurar Padrões de Fábrica
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Histórico de Auditoria */}
        {activeTab === 'audit' && (
          <div className="tab-pane animate-fade-in">
            <div className="audit-log-header">
              <h4>Registro de Auditorias & Eventos</h4>
              {auditLog.length > 0 && (
                <button className="btn btn--sm btn--danger-outline" onClick={onClearAuditLog}>
                  <Trash2 size={12} />
                  Limpar Logs
                </button>
              )}
            </div>

            {auditLog.length === 0 ? (
              <div className="audit-empty-state">
                <History size={36} className="text-dim" />
                <p>Nenhum registro de auditoria gravado no sistema.</p>
              </div>
            ) : (
              <div className="audit-timeline">
                {auditLog.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                  return (
                    <div className="audit-timeline-item" key={log.id}>
                      <div className="audit-timeline-badge"></div>
                      <div className="audit-timeline-content">
                        <div className="audit-timeline-header">
                          <span className="audit-action-title">{log.action}</span>
                          <span className="audit-time">{dateStr} às {timeStr}</span>
                        </div>
                        <p className="audit-details">{log.details}</p>
                        <span className="audit-user">Operador: {log.user}</span>
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
