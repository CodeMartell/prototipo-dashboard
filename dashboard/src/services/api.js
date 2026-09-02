/**
 * src/services/api.js
 * Cliente único de comunicação com o backend (FastAPI, /api/*).
 *
 * O vite.config.js já faz proxy de /api -> http://localhost:5001,
 * então as chamadas aqui usam caminhos relativos (funciona em dev
 * sem problema de CORS; em produção, ajustar o proxy/base URL conforme
 * onde a API for hospedada).
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

/**
 * Faz login na API (POST /api/auth/login), guarda o token e os dados
 * do usuário (via GET /api/auth/me). Lança erro com mensagem amigável
 * em caso de falha — a LoginPage decide o que mostrar.
 */
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

  // Busca os dados do usuário logado (email/role) pra exibir no Header
  // e pra decisões de UI (ex: esconder Analysis pra VISUALIZADOR).
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
    throw new Error(body.error || `Erro na API (status ${response.status})`);
  }

  return response.json();
}

/* ────────────────────────────────
   Dados do dashboard
   ──────────────────────────────── */

/**
 * O backend guarda o ano como string cheia ("2025", "2026"), mas os
 * componentes do dashboard (gráficos, comparação YoY) esperam o
 * formato curto usado nos mocks ("Y25", "Y26"). Convertemos aqui,
 * numa única camada, pra não precisar tocar em cada componente.
 */
function toShortYear(fullYear) {
  if (!fullYear) return fullYear;
  if (/^Y\d{2}$/.test(fullYear)) return fullYear; // já está no formato certo
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

/**
 * Busca todos os KPIs do dashboard numa única chamada
 * (GET /api/kpis/dashboard), já normalizados. Cobre os 6 indicadores:
 * logistic_cost, air_freight, incidental_cost, total_cost, demurrage e
 * logistics_vs_prod.
 * Lança UnauthorizedError se a sessão expirou — quem chamar decide
 * se redireciona pro /login.
 */
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

/**
 * O banco guarda o ano como "Y25"/"Y26" (mesmo formato usado na tela),
 * mas aceitamos "2026" caso venha de outra origem.
 */
function toApiYear(year) {
  if (!year) throw new Error('Ano obrigatório.');
  const digits = String(year).replace(/\D/g, '');
  if (digits.length < 2) throw new Error(`Ano inválido: ${year}`);
  return `Y${digits.slice(-2)}`;
}

/**
 * Grava (cria ou atualiza) o valor de um indicador padrão num mês.
 * O backend calcula o achievement quando ele não é enviado.
 */
export async function saveKpiRecord(kpiType, { year, month, target, result, achievement = null }) {
  return authFetch(`/api/kpis/${kpiType}/${toApiYear(year)}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, result, achievement }),
  });
}

/**
 * Grava (cria ou atualiza) custo logístico x volume produzido num mês.
 * O backend calcula o ratio quando ele não é enviado.
 */
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

/** Remove o lançamento de um indicador num mês. */
export async function deleteKpiRecord(kpiType, { year, month }) {
  return authFetch(`/api/kpis/${kpiType}/${toApiYear(year)}/${month}`, { method: 'DELETE' });
}

export { UnauthorizedError };
