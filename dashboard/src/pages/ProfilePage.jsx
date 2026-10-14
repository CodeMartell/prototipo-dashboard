import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
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
  fetchKpiChanges,
  acceptIngestion,
  acceptPartialIngestion,
  rejectIngestion,
  rollbackIngestion,
} from '../services/api';
import { hasPermission } from '../services/permissions';
import { useTranslation } from 'react-i18next';
import './ProfilePage.css';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const canManageIngestion = hasPermission(user, 'kpi:write_manual');
  const canSeeChanges = hasPermission(user, 'kpi:write_manual') || hasPermission(user, 'audit:read_all');

  const initialTab = useMemo(() => {
    if (canManageIngestion) return 'staging';
    if (canSeeChanges) return 'changes';
    return null;
  }, [canManageIngestion, canSeeChanges]);

  const [activeTab, setActiveTab] = useState(initialTab); // 'staging' | 'changes' | 'emails' | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab 1: Staging Queue
  const [pendingIngestions, setPendingIngestions] = useState([]);
  
  // Tab 2: KPI Changes Log
  const [kpiChanges, setKpiChanges] = useState([]);

  // Tab 3: Email Ingestions History
  const [emailHistory, setEmailHistory] = useState([]);

  // Modals
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [partialModalItem, setPartialModalItem] = useState(null);
  const [selectedPartialKeys, setSelectedPartialKeys] = useState({});

  const loadData = useCallback(async () => {
    if (!activeTab) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'staging' && canManageIngestion) {
        const data = await fetchPendingIngestions();
        setPendingIngestions(data || []);
      } else if (activeTab === 'changes' && canSeeChanges) {
        const data = await fetchKpiChanges({});
        setKpiChanges(data || []);
      } else if (activeTab === 'emails' && canManageIngestion) {
        const data = await fetchEmailIngestions({});
        setEmailHistory(data || []);
      }
    } catch (err) {
      setError(err.message || t('profile.err_load'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, canManageIngestion, canSeeChanges]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleAccept = async (id) => {
    if (!canManageIngestion) return;
    setLoading(true);
    try {
      await acceptIngestion(id);
      setSuccessMessage(t('profile.msg_acc'));
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || t('profile.err_acc'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRejectModal = (item) => {
    setRejectModalItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem || !canManageIngestion) return;
    setLoading(true);
    try {
      await rejectIngestion(rejectModalItem.id, rejectReason);
      setSuccessMessage(t('profile.msg_rej'));
      setTimeout(() => setSuccessMessage(null), 4000);
      setRejectModalItem(null);
      await loadData();
    } catch (err) {
      setError(err.message || t('profile.err_rej'));
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
        throw new Error(t('profile.err_sel_part'));
      }

      await acceptPartialIngestion(partialModalItem.id, selectedItems);
      setSuccessMessage(t('profile.msg_acc_part'));
      setTimeout(() => setSuccessMessage(null), 4000);
      setPartialModalItem(null);
      await loadData();
    } catch (err) {
      setError(err.message || t('profile.err_acc_part'));
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm(t('profile.warn_rollback'))) return;
    setLoading(true);
    try {
      await rollbackIngestion(id);
      setSuccessMessage(t('profile.msg_rollback'));
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setError(err.message || t('profile.err_rollback'));
    } finally {
      setLoading(false);
    }
  };

  const formatDelta = (oldVal, newVal) => {
    if (oldVal === null || oldVal === undefined) return <span className="val-new">{t('profile.val_new')}</span>;
    const diff = newVal - oldVal;
    if (diff === 0) return <span className="val-old">{t('profile.val_no_change')}</span>;
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
            {t('profile.btn_back_dash')}
          </button>
          <span className="profile-header-bar__title">{t('profile.title_gov')}</span>
        </div>
        <button className="btn-back" onClick={loadData} title={t('profile.btn_refresh')}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t('profile.btn_refresh')}
        </button>
      </div>

      {/* Hero Section */}
      <div className="profile-user-hero">
        <div className="profile-hero__avatar">
          {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-hero__details">
          <h2>{user?.name || t('profile.lbl_user')}</h2>
          <p>{user?.email} • {t('profile.lbl_role')} <strong>{user?.role || '—'}</strong></p>
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

      {/* Navigation Tabs — apenas abas permitidas são exibidas */}
      {(canManageIngestion || canSeeChanges) && (
        <div className="profile-tabs">
          {canManageIngestion && (
            <button
              className={`profile-tab-btn ${activeTab === 'staging' ? 'active' : ''}`}
              onClick={() => setActiveTab('staging')}
            >
              <ShieldCheck size={16} />
              {t('profile.tab_staging')}
              {pendingIngestions.length > 0 && (
                <span className="tab-badge">{pendingIngestions.length}</span>
              )}
            </button>
          )}

          {canSeeChanges && (
            <button
              className={`profile-tab-btn ${activeTab === 'changes' ? 'active' : ''}`}
              onClick={() => setActiveTab('changes')}
            >
              <Edit3 size={16} />
              {t('profile.tab_changes')}
            </button>
          )}

          {canManageIngestion && (
            <button
              className={`profile-tab-btn ${activeTab === 'emails' ? 'active' : ''}`}
              onClick={() => setActiveTab('emails')}
            >
              <Mail size={16} />
              {t('profile.tab_emails')}
            </button>
          )}
        </div>
      )}


      {/* Main Content Area */}
      <div className="profile-content">
        {/* TAB 1: STAGING QUEUE */}
        {activeTab === 'staging' && (
          <div>
            <p className="profile-tab-description">
              {t('profile.desc_staging')}
            </p>

            {pendingIngestions.length === 0 ? (
              <div className="profile-empty-state">
                <CheckCircle2 size={40} className="profile-empty-state__icon" />
                <h3>{t('profile.empty_staging_title')}</h3>
                <p>{t('profile.empty_staging_desc')}</p>
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
                          {t('profile.lbl_from')} <strong>{item.sender}</strong> • {t('profile.lbl_period')} <strong>{item.period_label || t('profile.val_not_detect')}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="queue-card__tags">
                      <span className="status-tag status-tag--pending">{t('profile.tag_pending')}</span>
                      {item.is_update && (
                        <span className="status-tag status-tag--superseded">{t('profile.tag_update')}</span>
                      )}
                    </div>
                  </div>

                  {item.has_manual_conflict && (
                    <div className="conflict-alert">
                      <AlertTriangle size={18} />
                      <div>
                        <strong>{t('profile.alert_conflict_title')}</strong>
                        <div>{t('profile.alert_conflict_desc')}</div>
                      </div>
                    </div>
                  )}

                  <table className="diff-table">
                    <thead>
                      <tr>
                        <th>{t('profile.th_kpi')}</th>
                        <th>{t('profile.th_period')}</th>
                        <th>{t('profile.th_curr_val')}</th>
                        <th>{t('profile.th_new_val_sheet')}</th>
                        <th>{t('profile.th_diff')}</th>
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

                  {canManageIngestion && (
                    <div className="queue-card__actions">
                      <button className="btn-reject" onClick={() => handleOpenRejectModal(item)}>
                        <X size={16} />
                        {t('profile.btn_reject')}
                      </button>
                      <button className="btn-partial" onClick={() => handleOpenPartialModal(item)}>
                        <Check size={16} />
                        {t('profile.btn_acc_part')}
                      </button>
                      <button className="btn-accept" onClick={() => handleAccept(item.id)}>
                        <CheckCircle2 size={16} />
                        {t('profile.btn_acc_all')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}


        {/* TAB 3: MANUAL CHANGES LOG */}
        {activeTab === 'changes' && (
          <div>
            <p className="profile-tab-description">
              {t('profile.desc_changes')}
            </p>

            <table className="diff-table diff-table--card">
              <thead>
                <tr>
                  <th>{t('profile.th_date')}</th>
                  <th>{t('profile.th_user')}</th>
                  <th>{t('profile.th_kpi')}</th>
                  <th>{t('profile.th_period')}</th>
                  <th>{t('profile.th_field')}</th>
                  <th>{t('profile.th_old_val')}</th>
                  <th>{t('profile.th_new_val')}</th>
                  <th>{t('profile.th_source')}</th>
                </tr>
              </thead>
              <tbody>
                {kpiChanges.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.empty_changes')}</td>
                  </tr>
                ) : (
                  kpiChanges.map((c) => (
                    <tr key={c.id}>
                      <td className="val-old">
                        {c.changed_at ? new Date(c.changed_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : '—'}
                      </td>
                      <td>{c.user_email || t('profile.lbl_user')}</td>
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
              {t('profile.desc_emails')}
            </p>

            <table className="diff-table diff-table--card">
              <thead>
                <tr>
                  <th>{t('profile.th_recv_date')}</th>
                  <th>{t('profile.th_file_subj')}</th>
                  <th>{t('profile.th_sender')}</th>
                  <th>{t('profile.th_period_cov')}</th>
                  <th>{t('profile.th_status')}</th>
                  <th>{t('profile.th_reviewed_by')}</th>
                  <th>{t('profile.th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.empty_emails')}</td>
                  </tr>
                ) : (
                  emailHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="val-old">
                        {item.created_at ? new Date(item.created_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : '—'}
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
                        {item.status === 'ACCEPTED' && canManageIngestion && (
                          <button className="btn-rollback" onClick={() => handleRollback(item.id)}>
                            <RotateCcw size={12} />
                            {t('profile.btn_rollback')}
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

        {!canManageIngestion && !canSeeChanges && (
          <div className="profile-empty-state">
            <CheckCircle2 size={40} className="profile-empty-state__icon" />
            <h3>{t('profile.restr_title')}</h3>
            <p>{t('profile.restr_desc')}</p>
          </div>
        )}
      </div>


      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('profile.mod_rej_title')}</h3>
            <p className="modal-subtitle">
              {t('profile.mod_file')} <strong>{rejectModalItem.file_name}</strong> ({rejectModalItem.period_label})
            </p>
            <label className="modal-label">{t('profile.mod_rej_reason')}</label>
            <textarea
              className="modal-textarea"
              placeholder={t('profile.mod_rej_ph')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-back" onClick={() => setRejectModalItem(null)}>{t('profile.btn_cancel')}</button>
              <button className="btn-reject" onClick={handleConfirmReject}>{t('profile.btn_confirm_rej')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Accept Modal */}
      {partialModalItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <h3>{t('profile.mod_part_title')}</h3>
            <p className="modal-subtitle">
              {t('profile.mod_part_desc')}
            </p>
            <div className="partial-list-wrapper">
              <table className="diff-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>{t('profile.th_kpi')}</th>
                    <th>{t('profile.th_period')}</th>
                    <th>{t('profile.th_new_val')}</th>
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
              <button className="btn-back" onClick={() => setPartialModalItem(null)}>{t('profile.btn_cancel')}</button>
              <button className="btn-accept" onClick={handleConfirmPartial}>{t('profile.btn_apply_sel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

