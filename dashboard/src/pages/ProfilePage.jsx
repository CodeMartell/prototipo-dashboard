import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Edit3,
  Mail,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getCurrentUser,
  fetchPendingIngestions,
  fetchEmailIngestions,
  fetchActivityLog,
  fetchKpiChanges,
  acceptIngestion,
  acceptPartialIngestion,
  rejectIngestion,
  rollbackIngestion,
} from '../services/api';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('staging'); // 'staging' | 'activity' | 'changes' | 'emails'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab 1: Staging Queue
  const [pendingIngestions, setPendingIngestions] = useState([]);
  
  // Tab 2: Activity Log
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityFilter, setActivityFilter] = useState('');

  // Tab 3: KPI Changes Log
  const [kpiChanges, setKpiChanges] = useState([]);

  // Tab 4: Email Ingestions History
  const [emailHistory, setEmailHistory] = useState([]);

  // Modals
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [partialModalItem, setPartialModalItem] = useState(null);
  const [selectedPartialKeys, setSelectedPartialKeys] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'staging') {
        const data = await fetchPendingIngestions();
        setPendingIngestions(data || []);
      } else if (activeTab === 'activity') {
        const data = await fetchActivityLog({ actionType: activityFilter });
        setActivityLogs(data || []);
      } else if (activeTab === 'changes') {
        const data = await fetchKpiChanges({});
        setKpiChanges(data || []);
      } else if (activeTab === 'emails') {
        const data = await fetchEmailIngestions({});
        setEmailHistory(data || []);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  }, [activeTab, activityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleAccept = async (id) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      await acceptIngestion(id);
      setSuccessMessage('Planilha aceita e aplicada no dashboard com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || 'Falha ao aceitar a planilha');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRejectModal = (item) => {
    setRejectModalItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem || !isAdmin) return;
    setLoading(true);
    try {
      await rejectIngestion(rejectModalItem.id, rejectReason);
      setSuccessMessage('Atualização de planilha rejeitada com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setRejectModalItem(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Falha ao rejeitar');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPartialModal = (item) => {
    setPartialModalItem(item);
    const initialMap = {};
    (item.diff_snapshot || []).forEach((diff, idx) => {
      initialMap[`${diff.kpi_type}:${diff.month}:${diff.year}`] = true;
    });
    setSelectedPartialKeys(initialMap);
  };

  const handleConfirmPartial = async () => {
    if (!partialModalItem || !isAdmin) return;
    setLoading(true);
    try {
      const selectedItems = [];
      (partialModalItem.diff_snapshot || []).forEach((diff) => {
        const key = `${diff.kpi_type}:${diff.month}:${diff.year}`;
        if (selectedPartialKeys[key]) {
          selectedItems.push({
            kpi_type: diff.kpi_type,
            month: diff.month,
            year: diff.year,
          });
        }
      });

      if (selectedItems.length === 0) {
        throw new Error('Selecione pelo menos um item para aceitar parcialmente');
      }

      await acceptPartialIngestion(partialModalItem.id, selectedItems);
      setSuccessMessage('Atualização aceita parcialmente com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
      setPartialModalItem(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Falha ao aceitar parcialmente');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Tem certeza de que deseja reverter esta ingestão? Os valores anteriores serão restaurados.')) return;
    setLoading(true);
    try {
      await rollbackIngestion(id);
      setSuccessMessage('Ingestão revertida com sucesso. Dados anteriores restaurados.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || 'Falha no rollback');
    } finally {
      setLoading(false);
    }
  };

  const formatDelta = (oldVal, newVal) => {
    if (oldVal === null || oldVal === undefined) return <span className="val-new">NOVO</span>;
    const diff = newVal - oldVal;
    if (diff === 0) return <span className="val-old">Sem alteração</span>;
    const pct = oldVal !== 0 ? ((diff / Math.abs(oldVal)) * 100).toFixed(1) : '100.0';
    const isUp = diff > 0;
    return (
      <span className={isUp ? 'val-delta--up' : 'val-delta--down'}>
        {isUp ? `+${diff.toFixed(2)} (+${pct}%)` : `${diff.toFixed(2)} (${pct}%)`}
      </span>
    );
  };

  const formatKpiName = (key) => {
    switch (key) {
      case 'logistic_cost': return 'War Room Report';
      case 'air_freight': return 'AIR Freight';
      case 'incidental_cost': return 'Resin Consolidation';
      case 'total_cost': return 'Task Cost Reduction';
      case 'demurrage': return 'Demurrage Cost';
      case 'logistics_vs_prod': return 'Logistics Cost vs Prod';
      default: return key;
    }
  };

  return (
    <div className="profile-page">
      {/* Top Bar */}
      <div className="profile-header-bar">
        <div className="profile-header-bar__left">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Voltar ao Dashboard
          </button>
          <span className="profile-header-bar__title">Governança & Perfil</span>
        </div>
        <button className="btn-back" onClick={loadData} title="Atualizar dados">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Hero Section */}
      <div className="profile-user-hero">
        <div className="profile-hero__avatar">
          {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-hero__details">
          <h2>{user?.name || 'Usuário'}</h2>
          <p>{user?.email} • Perfil: <strong>{user?.role || '—'}</strong></p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="profile-alert profile-alert--success">
          <CheckCircle2 size={16} />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="profile-alert profile-alert--error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab-btn ${activeTab === 'staging' ? 'active' : ''}`}
          onClick={() => setActiveTab('staging')}
        >
          <ShieldCheck size={16} />
          Fila de Aprovação (Staging)
          {pendingIngestions.length > 0 && (
            <span className="tab-badge">{pendingIngestions.length}</span>
          )}
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity size={16} />
          Histórico de Atividade
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          <Edit3 size={16} />
          Alterações Manuais
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'emails' ? 'active' : ''}`}
          onClick={() => setActiveTab('emails')}
        >
          <Mail size={16} />
          Dados Recebidos por Email
        </button>
      </div>

      {/* Main Content Area */}
      <div className="profile-content">
        {/* TAB 1: STAGING QUEUE */}
        {activeTab === 'staging' && (
          <div>
            <p className="profile-tab-description">
              Todas as planilhas recebidas por e-mail entram primeiro nesta fila de staging.
              Revise o impacto no dashboard antes de aceitar.
            </p>

            {pendingIngestions.length === 0 ? (
              <div className="profile-empty-state">
                <CheckCircle2 size={40} className="profile-empty-state__icon" />
                <h3>Nenhuma atualização pendente</h3>
                <p>Todas as planilhas ingeridas estão aprovadas ou revisadas.</p>
              </div>
            ) : (
              pendingIngestions.map((item) => (
                <div key={item.id} className="queue-card">
                  <div className="queue-card__header">
                    <div className="queue-card__title">
                      <FileSpreadsheet size={20} className="queue-card__title-icon" />
                      <div>
                        <h3>{item.file_name || item.subject}</h3>
                        <span className="queue-card__meta">
                          De: <strong>{item.sender}</strong> • Período: <strong>{item.period_label || 'Não detectado'}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="queue-card__tags">
                      <span className="status-tag status-tag--pending">Pendente</span>
                      {item.is_update && (
                        <span className="status-tag status-tag--superseded">Atualização</span>
                      )}
                    </div>
                  </div>

                  {item.has_manual_conflict && (
                    <div className="conflict-alert">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Atenção: Conflito com Edição Manual!</strong>
                        <div>Esta planilha substituiria valores que foram ajustados manualmente anteriormente por um usuário.</div>
                      </div>
                    </div>
                  )}

                  <table className="diff-table">
                    <thead>
                      <tr>
                        <th>KPI</th>
                        <th>Período</th>
                        <th>Valor Atual</th>
                        <th>Novo Valor (Planilha)</th>
                        <th>Variação (Diff)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.diff_snapshot || []).map((diff, i) => (
                        <tr key={i} className={diff.has_conflict ? 'row--conflict' : ''}>
                          <td>
                            <strong>{formatKpiName(diff.kpi_type)}</strong>
                            {diff.has_conflict && (
                              <span className="conflict-detail-text">
                                {diff.conflict_detail}
                              </span>
                            )}
                          </td>
                          <td>{diff.month}/{diff.year}</td>
                          <td className="val-old">
                            {diff.type === 'logistics_vs_prod'
                              ? (diff.current_logistics_cost !== null ? diff.current_logistics_cost.toLocaleString() : '—')
                              : (diff.current_result !== null ? diff.current_result.toLocaleString() : '—')}
                          </td>
                          <td className="val-new">
                            {diff.type === 'logistics_vs_prod'
                              ? diff.new_logistics_cost.toLocaleString()
                              : diff.new_result.toLocaleString()}
                          </td>
                          <td>
                            {formatDelta(
                              diff.type === 'logistics_vs_prod' ? diff.current_logistics_cost : diff.current_result,
                              diff.type === 'logistics_vs_prod' ? diff.new_logistics_cost : diff.new_result
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="queue-card__actions">
                    {isAdmin ? (
                      <>
                        <button className="btn-reject" onClick={() => handleOpenRejectModal(item)}>
                          <X size={16} />
                          Rejeitar
                        </button>
                        <button className="btn-partial" onClick={() => handleOpenPartialModal(item)}>
                          <Check size={16} />
                          Aceitar Parcial...
                        </button>
                        <button className="btn-accept" onClick={() => handleAccept(item.id)}>
                          <CheckCircle2 size={16} />
                          Aceitar Tudo
                        </button>
                      </>
                    ) : (
                      <span className="not-admin-note">
                        Apenas Administradores podem aprovar/rejeitar planilhas.
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: AUDIT ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div>
            <div className="profile-filter-row">
              <p className="profile-tab-description" style={{ margin: 0 }}>
                Trilha auditável completa de acessos, logins, alterações manuais e ações de governança.
              </p>
              <select
                className="profile-filter-select"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
              >
                <option value="">Todas as Ações</option>
                <option value="LOGIN">Logins</option>
                <option value="MANUAL_EDIT">Edições Manuais</option>
                <option value="EMAIL_INGEST_PENDING">Recebimento por Email</option>
                <option value="EMAIL_INGEST_ACCEPTED">Aceites de Planilha</option>
                <option value="EMAIL_INGEST_REJECTED">Rejeições de Planilha</option>
                <option value="ROLLBACK">Rollbacks</option>
              </select>
            </div>

            <table className="diff-table diff-table--card">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade / KPI</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum log encontrado.</td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="val-old">
                        {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>{log.user_email || log.user_id || 'SISTEMA (RPA)'}</td>
                      <td>
                        <span className="action-tag">{log.action_type}</span>
                      </td>
                      <td>{log.entity_type ? `${log.entity_type} (${log.entity_id || ''})` : '—'}</td>
                      <td className="val-old" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {log.detail ? JSON.stringify(log.detail) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: MANUAL CHANGES LOG */}
        {activeTab === 'changes' && (
          <div>
            <p className="profile-tab-description">
              Rastreabilidade de campos sobrescritos manualmente (Target, Resultado, Demurrage, etc.).
            </p>

            <table className="diff-table diff-table--card">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Usuário</th>
                  <th>KPI</th>
                  <th>Período</th>
                  <th>Campo</th>
                  <th>Valor Anterior</th>
                  <th>Novo Valor</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {kpiChanges.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma alteração manual registrada.</td>
                  </tr>
                ) : (
                  kpiChanges.map((c) => (
                    <tr key={c.id}>
                      <td className="val-old">
                        {c.changed_at ? new Date(c.changed_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>{c.user_email || 'Usuário'}</td>
                      <td><strong>{formatKpiName(c.kpi_type)}</strong></td>
                      <td>{c.month}/{c.year}</td>
                      <td><code>{c.field_name}</code></td>
                      <td className="val-old">{c.old_value !== null ? c.old_value.toLocaleString() : '—'}</td>
                      <td className="val-new">{c.new_value !== null ? c.new_value.toLocaleString() : '—'}</td>
                      <td>
                        <span
                          className="status-tag"
                          style={
                            c.source === 'manual'
                              ? { background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.28)' }
                              : { background: 'rgba(34,197,94,0.12)', color: 'var(--success)', borderColor: 'rgba(34,197,94,0.28)' }
                          }
                        >
                          {c.source}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: EMAIL INGESTION HISTORY */}
        {activeTab === 'emails' && (
          <div>
            <p className="profile-tab-description">
              Histórico completo de planilhas recebidas por e-mail e seu estado no pipeline de governança.
            </p>

            <table className="diff-table diff-table--card">
              <thead>
                <tr>
                  <th>Data de Recebimento</th>
                  <th>Arquivo / Assunto</th>
                  <th>Remetente</th>
                  <th>Período Coberto</th>
                  <th>Status</th>
                  <th>Revisado por</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum e-mail de planilha ingerido até o momento.</td>
                  </tr>
                ) : (
                  emailHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="val-old">
                        {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td>
                        <strong>{item.file_name || item.subject}</strong>
                      </td>
                      <td>{item.sender}</td>
                      <td>{item.period_label || '—'}</td>
                      <td>
                        <span className={`status-tag status-tag--${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="val-old">
                        {item.reviewer_email || '—'}
                      </td>
                      <td>
                        {item.status === 'ACCEPTED' && isAdmin && (
                          <button className="btn-rollback" onClick={() => handleRollback(item.id)}>
                            <RotateCcw size={12} />
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Rejeitar Atualização de Planilha</h3>
            <p className="modal-subtitle">
              Arquivo: <strong>{rejectModalItem.file_name}</strong> ({rejectModalItem.period_label})
            </p>
            <label className="modal-label">Motivo da rejeição (opcional):</label>
            <textarea
              className="modal-textarea"
              placeholder="Ex: Planilha de mês anterior enviada por engano..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-back" onClick={() => setRejectModalItem(null)}>Cancelar</button>
              <button className="btn-reject" onClick={handleConfirmReject}>Confirmar Rejeição</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Accept Modal */}
      {partialModalItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <h3>Aceitar Parcialmente Planilha</h3>
            <p className="modal-subtitle">
              Selecione quais KPIs e períodos deseja aceitar e aplicar no dashboard:
            </p>
            <div className="partial-list-wrapper">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>KPI</th>
                    <th>Período</th>
                    <th>Novo Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(partialModalItem.diff_snapshot || []).map((diff, idx) => {
                    const key = `${diff.kpi_type}:${diff.month}:${diff.year}`;
                    return (
                      <tr key={idx}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!selectedPartialKeys[key]}
                            onChange={(e) => {
                              setSelectedPartialKeys({
                                ...selectedPartialKeys,
                                [key]: e.target.checked,
                              });
                            }}
                          />
                        </td>
                        <td>{formatKpiName(diff.kpi_type)}</td>
                        <td>{diff.month}/{diff.year}</td>
                        <td className="val-new">
                          {diff.type === 'logistics_vs_prod' ? diff.new_logistics_cost : diff.new_result}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn-back" onClick={() => setPartialModalItem(null)}>Cancelar</button>
              <button className="btn-accept" onClick={handleConfirmPartial}>Aplicar Selecionados</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

