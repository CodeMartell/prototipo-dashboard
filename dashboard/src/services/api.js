/**
 * src/services/api.js
 * Cliente único de comunicação com o backend (FastAPI, /api/*).
 */

const TOKEN_KEY = 'datalens_token';
const USER_KEY = 'datalens_user';

/* ────────────────────────────────
   Sessão (token + dados do usuário)
   ──────────────────────────────── */

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* ────────────────────────────────
   Login
   ──────────────────────────────── */

export async function login(email, password) {
  logout();
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('E-mail ou senha inválidos.');
    }
    throw new Error('Não foi possível entrar. Tente novamente em instantes.');
  }

  const { access_token: token } = await response.json();
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Resposta de autenticação inválida.');
  }

  const meResponse = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meResponse.ok) {
    throw new Error('Não foi possível validar a sessão. Faça login novamente.');
  }
  const user = await meResponse.json();
  if (!user?.id || !user?.email || !user?.role) {
    throw new Error('Resposta de usuário inválida.');
  }
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    logout();
    throw error;
  }
  return user;
}

/* ────────────────────────────────
   Fetch autenticado genérico
   ──────────────────────────────── */

class UnauthorizedError extends Error {}

async function authFetch(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    logout();
    throw new UnauthorizedError('Sessão expirada, faça login novamente.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || body.error || `Erro na API (status ${response.status})`);
  }

  return response.json();
}

/* ────────────────────────────────
   Dados do dashboard
   ──────────────────────────────── */

function toShortYear(fullYear) {
  if (!fullYear) return fullYear;
  if (/^Y\d{2}$/.test(fullYear)) return fullYear;
  return `Y${String(fullYear).slice(-2)}`;
}

function normalizeRecords(records) {
  return (records || []).map((r) => ({ ...r, year: toShortYear(r.year) }));
}

function normalizeLogisticsVsProd(records) {
  return normalizeRecords(records).map((record) => ({
    ...record,
    logisticsCost: record.logistics_cost,
    productionAmount: record.production_amount,
  }));
}

export async function fetchDashboardData() {
  const data = await authFetch('/api/kpis/dashboard');

  return {
    logistic_cost: normalizeRecords(data.logistic_cost),
    air_freight: normalizeRecords(data.air_freight),
    incidental_cost: normalizeRecords(data.incidental_cost),
    total_cost: normalizeRecords(data.total_cost),
    demurrage: normalizeRecords(data.demurrage),
    logistics_vs_prod: normalizeLogisticsVsProd(data.logistics_vs_prod),
  };
}

/* ────────────────────────────────
   Lançamento manual de indicadores
   ──────────────────────────────── */

function toApiYear(year) {
  if (!year) throw new Error('Ano obrigatório.');
  const digits = String(year).replace(/\D/g, '');
  if (digits.length < 2) throw new Error(`Ano inválido: ${year}`);
  return `Y${digits.slice(-2)}`;
}

export async function saveKpiRecord(kpiType, { year, month, target, result, achievement = null }) {
  return authFetch(`/api/kpis/${kpiType}/${toApiYear(year)}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, result, achievement }),
  });
}

export async function saveLogisticsVsProd({ year, month, logisticsCost, productionAmount, ratio = null }) {
  return authFetch(`/api/kpis/extra/logistics-vs-prod/${toApiYear(year)}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      logistics_cost: logisticsCost,
      production_amount: productionAmount,
      ratio,
    }),
  });
}

export async function deleteKpiRecord(kpiType, { year, month }) {
  return authFetch(`/api/kpis/${kpiType}/${toApiYear(year)}/${month}`, { method: 'DELETE' });
}

/* ────────────────────────────────
   Perfil, Auditoria e Governança
   ──────────────────────────────── */

export async function fetchActivityLog({ actionType = '', limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (actionType) params.append('action_type', actionType);
  params.append('limit', limit);
  params.append('offset', offset);
  return authFetch(`/api/profile/activity?${params.toString()}`);
}

export async function fetchKpiChanges({ kpiType = '', source = '', limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (kpiType) params.append('kpi_type', kpiType);
  if (source) params.append('source', source);
  params.append('limit', limit);
  params.append('offset', offset);
  return authFetch(`/api/profile/kpi-changes?${params.toString()}`);
}

export async function fetchEmailIngestions({ status = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit);
  params.append('offset', offset);
  return authFetch(`/api/profile/email-ingestions?${params.toString()}`);
}

export async function fetchPendingIngestions() {
  return authFetch('/api/profile/pending-ingestions');
}

export async function acceptIngestion(queueId) {
  return authFetch(`/api/profile/ingestions/${queueId}/accept`, {
    method: 'POST',
  });
}

export async function acceptPartialIngestion(queueId, items) {
  return authFetch(`/api/profile/ingestions/${queueId}/accept-partial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

export async function rejectIngestion(queueId, reason = '') {
  return authFetch(`/api/profile/ingestions/${queueId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function rollbackIngestion(queueId) {
  return authFetch(`/api/profile/ingestions/${queueId}/rollback`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Gestão de usuários (ADMIN e TI_SUPORTE)
// ---------------------------------------------------------------------------

export async function fetchUsers() {
  return authFetch('/api/users');
}

export async function fetchUser(userId) {
  return authFetch(`/api/users/${userId}`);
}

export async function createUser(data) {
  return authFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateUser(userId, data) {
  return authFetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateUserRole(userId, roleName) {
  return authFetch(`/api/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_name: roleName }),
  });
}

export async function deleteUser(userId) {
  return authFetch(`/api/users/${userId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function fetchAuditLogs({ dateFrom, dateTo, actorUserId, action, page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom.toISOString ? dateFrom.toISOString() : dateFrom);
  if (dateTo) params.set('date_to', dateTo.toISOString ? dateTo.toISOString() : dateTo);
  if (actorUserId) params.set('actor_user_id', actorUserId);
  if (action) params.set('action', action);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  return authFetch(`/api/audit-logs?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Planos de ação
// ---------------------------------------------------------------------------

export async function fetchActionPlans({ kpiType, status } = {}) {
  const params = new URLSearchParams();
  if (kpiType) params.set('kpi_type', kpiType);
  if (status) params.set('status', status);
  return authFetch(`/api/action-plans?${params.toString()}`);
}

export async function createActionPlan(data) {
  return authFetch('/api/action-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateActionPlan(planId, data) {
  return authFetch(`/api/action-plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteActionPlan(planId) {
  return authFetch(`/api/action-plans/${planId}`, { method: 'DELETE' });
}

export { UnauthorizedError };
