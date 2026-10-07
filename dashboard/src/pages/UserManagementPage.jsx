/**
 * src/pages/UserManagementPage.jsx
 * Gestão de Usuários e Atribuição de Papéis (RBAC).
 * 
 * Regra Crítica de Anti-Escalação:
 * Quando o usuário logado for TI_SUPORTE, o seletor de papéis NÃO DEVE
 * listar a opção ADMIN. Apenas ADMIN pode atribuir ADMIN.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Shield,
  Trash2,
  Activity,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchUsers,
  createUser,
  updateUserRole,
  deleteUser,
  fetchAuditLogs,
  getCurrentUser,
} from '../services/api';
import { hasPermission } from '../services/permissions';
import DateRangeFilter from '../components/DateRangeFilter';
import { useTranslation } from 'react-i18next';
import './UserManagementPage.css';

const ALL_ROLES = ['ADMIN', 'GESTOR', 'TI_SUPORTE', 'AUDITORIA', 'VIEWER'];

const ROLE_DESCRIPTIONS = {
  ADMIN: 'Acesso total, gestão completa de usuários e atribuição de qualquer papel',
  GESTOR: 'Edição manual de KPIs e planos de ação (com checagem de autoria)',
  TI_SUPORTE: 'CRUD de usuários (exceto ADMIN) e consulta de atividade de usuários',
  AUDITORIA: 'Leitura irrestrita do log de auditoria de todos os usuários',
  VIEWER: 'Leitura básica do dashboard e planos de ação',
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const canWriteUsers = hasPermission(currentUser, 'users:write');
  const canAssignRole = hasPermission(currentUser, 'users:assign_role');
  const canAuditScoped = hasPermission(currentUser, 'audit:read_scoped') || hasPermission(currentUser, 'audit:read_all');

  // Anti-escalação na UI: TI_SUPORTE não pode ver/selecionar ADMIN
  const assignableRoles = useMemo(() => {
    if (isAdmin) return ALL_ROLES;
    return ALL_ROLES.filter((r) => r !== 'ADMIN');
  }, [isAdmin]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal Novo Usuário
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('VIEWER');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Modal Alterar Role
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Modal Atividade do Usuário (Audit Scoped)
  const [activityModalUser, setActivityModalUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [logDateFrom, setLogDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  });
  const [logDateTo, setLogDateTo] = useState(new Date());

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || t('users.err_load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setError(null);
    try {
      await createUser({
        name: newName || undefined,
        email: newEmail,
        password: newPassword,
        role_name: newRole,
      });
      setIsCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('VIEWER');
      setSuccessMsg(t('users.success_create'));
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || t('users.err_create'));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleModalUser || !selectedRole) return;
    setRoleSubmitting(true);
    setError(null);
    try {
      await updateUserRole(roleModalUser.id, selectedRole);
      setRoleModalUser(null);
      setSuccessMsg(t('users.success_role').replace('{email}', roleModalUser.email).replace('{role}', selectedRole));
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || t('users.err_role'));
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(t('users.confirm_del').replace('{email}', user.email))) return;
    setError(null);
    try {
      await deleteUser(user.id);
      setSuccessMsg(t('users.success_del').replace('{email}', user.email));
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || t('users.err_del'));
    }
  };

  // Carregar atividade do usuário específico
  const loadUserActivity = useCallback(async (userId) => {
    if (!userId || !logDateFrom) return;
    setUserLogsLoading(true);
    try {
      const res = await fetchAuditLogs({
        dateFrom: logDateFrom,
        dateTo: logDateTo,
        actorUserId: userId,
        page: 1,
        pageSize: 50,
      });
      setUserLogs(res.items || []);
    } catch (err) {
      console.error(err);
      setUserLogs([]);
    } finally {
      setUserLogsLoading(false);
    }
  }, [logDateFrom, logDateTo]);

  const openActivityModal = (targetUser) => {
    setActivityModalUser(targetUser);
    loadUserActivity(targetUser.id);
  };

  return (
    <div className="user-mgmt-page">
      {/* Header bar */}
      <header className="user-mgmt-header">
        <div className="user-mgmt-header__left">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title={t('users.back')}>
            <ArrowLeft size={14} />
            {t('users.back')}
          </button>
          <div>
            <div className="user-mgmt-header__title">{t('users.title')}</div>
            <div className="user-mgmt-header__subtitle">
              {t('users.subtitle')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {t('users.refresh')}
          </button>
          {canWriteUsers && (
            <button
              className="btn btn--primary"
              onClick={() => setIsCreateOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            >
              <UserPlus size={14} />
              {t('users.new_user')}
            </button>
          )}
        </div>
      </header>

      <main className="user-mgmt-content">
        {error && (
          <div className="audit-scoped-warning" style={{ backgroundColor: 'rgba(231,25,74,0.15)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="audit-scoped-warning" style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'var(--success)', color: 'var(--success)' }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabela de Usuários */}
        <section className="user-mgmt-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="user-mgmt-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="user-mgmt-table">
              <thead>
                <tr>
                  <th>{t('users.tbl_name')}</th>
                  <th>{t('users.tbl_email')}</th>
                  <th>{t('users.tbl_role')}</th>
                  <th>{t('users.tbl_id')}</th>
                  <th>{t('users.tbl_created')}</th>
                  <th style={{ textAlign: 'right' }}>{t('users.tbl_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                      {t('users.loading')}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {t('users.empty')}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name ? t(`names.${u.name}`, u.name) : '—'}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`user-role-badge user-role-badge--${u.role}`}>
                          {t(`roles.${u.role}`, u.role)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                        {u.id}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : '—'}
                      </td>
                      <td>
                        <div className="user-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {/* Consultar atividade individual */}
                          {canAuditScoped && (
                            <button
                              className="btn-action"
                              onClick={() => openActivityModal(u)}
                            >
                              <Activity size={13} />
                              {t('users.act_activity')}
                            </button>
                          )}

                          {/* Alterar papel */}
                          {canAssignRole && (
                            <button
                              className="btn-action"
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedRole(u.role);
                              }}
                            >
                              <Shield size={13} />
                              {t('users.act_role')}
                            </button>
                          )}

                          {/* Excluir usuário */}
                          {canWriteUsers && u.id !== currentUser?.id && (
                            <button
                              className="btn-action btn-action--danger"
                              onClick={() => handleDeleteUser(u)}
                              title="Excluir usuário"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL: Novo Usuário */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('users.modal_new_title')}</span>
              <button className="btn-back" onClick={() => setIsCreateOpen(false)} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('users.lbl_name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('users.ph_name')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('users.lbl_email')}</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder={t('users.ph_email')}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('users.lbl_pass')}</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('users.lbl_role')}</label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role} — {t(`users.roles.${role}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-back" onClick={() => setIsCreateOpen(false)}>
                  {t('users.btn_cancel')}
                </button>
                <button type="submit" className="btn btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('users.btn_saving') : t('users.btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Alterar Papel */}
      {roleModalUser && (
        <div className="modal-overlay" onClick={() => setRoleModalUser(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('users.modal_role_title')}</span>
              <button className="btn-back" onClick={() => setRoleModalUser(null)} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t('users.role_desc').replace('{name}', roleModalUser.name || roleModalUser.email)}
              </p>
              <div className="form-group">
                <label className="form-label">{t('users.lbl_new_role')}</label>
                <select
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role} — {t(`users.roles.${role}`)}
                    </option>
                  ))}
                </select>
              </div>

              {!isAdmin && (
                <div className="audit-scoped-warning" style={{ fontSize: '0.75rem' }}>
                  <span>{t('users.anti_esc')}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-back" onClick={() => setRoleModalUser(null)}>
                {t('users.btn_cancel')}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleUpdateRole}
                disabled={roleSubmitting || selectedRole === roleModalUser.role}
              >
                {roleSubmitting ? t('users.btn_saving') : t('users.btn_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Atividade do Usuário */}
      {activityModalUser && (
        <div className="modal-overlay" onClick={() => setActivityModalUser(null)}>
          <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">{t('users.modal_act_title').replace('{name}', activityModalUser.name || activityModalUser.email)}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  ID: {activityModalUser.id}
                </div>
              </div>
              <button className="btn-back" onClick={() => setActivityModalUser(null)} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <DateRangeFilter
                dateFrom={logDateFrom}
                dateTo={logDateTo}
                onChange={(from, to) => {
                  setLogDateFrom(from);
                  setLogDateTo(to);
                  if (from && activityModalUser) loadUserActivity(activityModalUser.id);
                }}
                loading={userLogsLoading}
              />

              <div className="user-mgmt-table-wrapper" style={{ maxHeight: '350px' }}>
                <table className="user-mgmt-table">
                  <thead>
                    <tr>
                      <th>{t('users.tbl_date')}</th>
                      <th>{t('users.tbl_action')}</th>
                      <th>{t('users.tbl_ev_role')}</th>
                      <th>{t('users.tbl_target')}</th>
                      <th>{t('users.tbl_ip')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLogsLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                          {t('users.load_logs')}
                        </td>
                      </tr>
                    ) : userLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {t('users.empty_logs')}
                        </td>
                      </tr>
                    ) : (
                      userLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
                            {log.occurred_at ? new Date(log.occurred_at).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : '—'}
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.action}</td>
                          <td>
                            <span className="audit-badge-role">{log.actor_role_snapshot || '—'}</span>
                          </td>
                          <td style={{ fontSize: '0.725rem' }}>
                            {log.target_type ? `${log.target_type}: ${log.target_id || ''}` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                            {log.ip_address || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-back" onClick={() => setActivityModalUser(null)}>
                {t('users.btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
