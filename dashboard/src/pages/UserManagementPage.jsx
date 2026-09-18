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
      setError(err.message || 'Erro ao carregar usuários');
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
      setSuccessMsg('Usuário criado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário');
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
      setSuccessMsg(`Papel de ${roleModalUser.email} alterado para ${selectedRole}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao atualizar papel do usuário');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.email}?`)) return;
    setError(null);
    try {
      await deleteUser(user.id);
      setSuccessMsg(`Usuário ${user.email} excluído.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Erro ao excluir usuário');
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
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Voltar ao dashboard">
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <div>
            <div className="user-mgmt-header__title">Gestão de Usuários &amp; Acessos</div>
            <div className="user-mgmt-header__subtitle">
              Controle de perfis granulares (RBAC) e rastreamento de acessos
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          {canWriteUsers && (
            <button
              className="btn btn--primary"
              onClick={() => setIsCreateOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
            >
              <UserPlus size={14} />
              Novo Usuário
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
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel Atual</th>
                  <th>ID do Usuário</th>
                  <th>Criado Em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                      Carregando usuários…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name || '—'}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`user-role-badge user-role-badge--${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
                        {u.id}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td>
                        <div className="user-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {/* Consultar atividade individual */}
                          {canAuditScoped && (
                            <button
                              className="btn-action"
                              onClick={() => openActivityModal(u)}
                              title="Consultar logs de atividade deste usuário"
                            >
                              <Activity size={13} />
                              Atividade
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
                              title="Alterar papel do usuário"
                            >
                              <Shield size={13} />
                              Papel
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
              <span className="modal-title">Cadastrar Novo Usuário</span>
              <button className="btn-back" onClick={() => setIsCreateOpen(false)} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: João da Silva"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="usuario@empresa.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha Inicial *</label>
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
                  <label className="form-label">Papel de Acesso *</label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role} — {ROLE_DESCRIPTIONS[role] || ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-back" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? 'Cadastrando…' : 'Salvar Usuário'}
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
              <span className="modal-title">Alterar Papel de Acesso</span>
              <button className="btn-back" onClick={() => setRoleModalUser(null)} style={{ padding: '0.25rem 0.5rem' }}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Selecione o novo papel para <strong>{roleModalUser.name || roleModalUser.email}</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">Novo Papel</label>
                <select
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role} — {ROLE_DESCRIPTIONS[role]}
                    </option>
                  ))}
                </select>
              </div>

              {!isAdmin && (
                <div className="audit-scoped-warning" style={{ fontSize: '0.75rem' }}>
                  <span>ℹ️ Por política de segurança (anti-escalação), apenas ADMIN pode atribuir o papel ADMIN.</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-back" onClick={() => setRoleModalUser(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleUpdateRole}
                disabled={roleSubmitting || selectedRole === roleModalUser.role}
              >
                {roleSubmitting ? 'Salvando…' : 'Confirmar Alteração'}
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
                <span className="modal-title">Atividade de {activityModalUser.name || activityModalUser.email}</span>
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
                      <th>Data / Hora</th>
                      <th>Ação</th>
                      <th>Papel no Evento</th>
                      <th>Alvo</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLogsLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                          Carregando logs do usuário…
                        </td>
                      </tr>
                    ) : userLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhum log encontrado para este usuário no período.
                        </td>
                      </tr>
                    ) : (
                      userLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
                            {log.occurred_at ? new Date(log.occurred_at).toLocaleString('pt-BR') : '—'}
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
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
