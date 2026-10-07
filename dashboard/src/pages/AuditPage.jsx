/**
 * src/pages/AuditPage.jsx
 * Página de auditoria — audit:read_all e audit:read_scoped.
 * TI_SUPORTE vê apenas com actor_user_id obrigatório.
 * ADMIN e AUDITORIA podem ver todos os eventos.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchAuditLogs, getCurrentUser } from '../services/api';
import { canReadAllAuditLog, hasPermission } from '../services/permissions';
import DateRangeFilter from '../components/DateRangeFilter';
import { useTranslation } from 'react-i18next';
import './AuditPage.css';

const ACTION_LABELS = {
  'login.success': 'audit.act_login_suc',
  'login.failed': 'audit.act_login_fail',
  'kpi.manual_edit': 'audit.act_kpi_edit',
  'kpi.deleted': 'audit.act_kpi_del',
  'user.created': 'audit.act_user_cre',
  'user.deleted': 'audit.act_user_del',
  'user.role_changed': 'audit.act_role_chg',
  'action_plan.created': 'audit.act_plan_cre',
  'action_plan.deleted': 'audit.act_plan_del',
};

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const user = getCurrentUser();
  const isReadAll = canReadAllAuditLog(user);
  const isReadScoped = hasPermission(user, 'audit:read_scoped');

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateTo, setDateTo] = useState(new Date());
  const [actorUserId, setActorUserId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDateChange = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const load = useCallback(async () => {
    if (!dateFrom && !dateTo) return;
    // TI_SUPORTE com apenas read_scoped: actor_user_id é obrigatório
    if (!isReadAll && isReadScoped && !actorUserId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchAuditLogs({
        dateFrom,
        dateTo,
        actorUserId: actorUserId || undefined,
        action: actionFilter || undefined,
        page,
        pageSize: 50,
      });
      setData(result);
    } catch (err) {
      setError(err.message || t('audit.err_load'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, actorUserId, actionFilter, page, isReadAll, isReadScoped]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="audit-page">
      {/* Header bar */}
      <header className="audit-header-bar">
        <div className="audit-header-bar__left">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title={t('audit.back')}>
            <ArrowLeft size={14} />
            {t('audit.back')}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="audit-header-bar__title">{t('audit.title')}</span>
            <span className="audit-header-bar__subtitle">
              {t('audit.subtitle')}
            </span>
          </div>
        </div>
        <button
          className="btn-back"
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t('audit.refresh')}
        </button>
      </header>

      <main className="audit-content">
        {/* Painel de Filtros */}
        <section className="audit-card">
          <div style={{ marginBottom: '1rem' }}>
            <span className="audit-filter-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('audit.lbl_period')}
            </span>
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateChange} loading={loading} />
          </div>

          <div className="audit-filters-row">
            {/* actor_user_id — obrigatório para TI_SUPORTE */}
            <div className="audit-filter-group">
              <label className="audit-filter-label">
                {t('audit.lbl_user_id')} {!isReadAll && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <input
                type="text"
                placeholder={isReadAll ? t('audit.ph_user_id_opt') : t('audit.ph_user_id_req')}
                value={actorUserId}
                onChange={(e) => { setActorUserId(e.target.value); setPage(1); }}
                className="audit-input"
                style={{ width: '320px' }}
              />
            </div>

            {/* Filtro por tipo de ação */}
            <div className="audit-filter-group">
              <label className="audit-filter-label">{t('audit.lbl_action_type')}</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="audit-select"
                style={{ width: '260px' }}
              >
                <option value="">{t('audit.opt_all_actions')}</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>

            {/* Aviso TI_SUPORTE */}
            {!isReadAll && isReadScoped && !actorUserId && (
              <div className="audit-scoped-warning">
                <AlertTriangle size={15} />
                <span>{t('audit.warn_sup_id')}</span>
              </div>
            )}
          </div>
        </section>

        {/* Tabela de eventos */}
        <section className="audit-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              {t('audit.loading')}
            </div>
          )}

          {error && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="audit-table-pagination">
                <span>
                  <strong>{data.total}</strong> {t('audit.event_reg').replace('{count}', '')}
                </span>
                {data.total > 50 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn-back"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ←
                    </button>
                    <span>{t('audit.pagination').replace('{page}', page).replace('{total}', Math.ceil(data.total / 50))}</span>
                    <button
                      className="btn-back"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={data.items.length < 50}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              <div className="audit-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>{t('audit.tbl_date')}</th>
                      <th>{t('audit.tbl_action')}</th>
                      <th>{t('audit.tbl_actor')}</th>
                      <th>{t('audit.tbl_role')}</th>
                      <th>{t('audit.tbl_target')}</th>
                      <th>{t('audit.tbl_ip')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {t('audit.empty')}
                        </td>
                      </tr>
                    ) : (
                      data.items.map((entry) => (
                        <tr key={entry.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {entry.occurred_at ? new Date(entry.occurred_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : '—'}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {ACTION_LABELS[entry.action] ? t(ACTION_LABELS[entry.action]) : entry.action}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {entry.actor_user_id || '—'}
                          </td>
                          <td>
                            {entry.actor_role_snapshot ? (
                              <span className="audit-badge-role">
                                {t(`roles.${entry.actor_role_snapshot}`, entry.actor_role_snapshot)}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ fontSize: '0.75rem' }}>
                            {entry.target_type && (
                              <span>
                                <strong>{t(`roles.${entry.target_type}`, entry.target_type)}</strong>: {entry.target_id || ''}
                              </span>
                            )}
                            {entry.metadata && (
                              <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                {JSON.stringify(entry.metadata)}
                              </div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {entry.ip_address || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && !error && !data && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('audit.empty')}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
