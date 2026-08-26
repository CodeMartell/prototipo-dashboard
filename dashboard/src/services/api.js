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
  localStorage.setItem(TOKEN_KEY, token);

  // Busca os dados do usuário logado (email/role) pra exibir no Header
  // e pra decisões de UI (ex: esconder Analysis pra VISUALIZADOR).
  const meResponse = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (meResponse.ok) {
    const user = await meResponse.json();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  return null;
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

/**
 * Busca os 3 KPIs que o dashboard consome hoje (logistic_cost,
 * air_freight, logistics_vs_prod), em paralelo, já normalizados.
 * Lança UnauthorizedError se a sessão expirou — quem chamar decide
 * se redireciona pro /login.
 */
export async function fetchDashboardData() {
  const [logisticCost, airFreight, logisticsVsProd] = await Promise.all([
    authFetch('/api/kpis/logistic_cost'),
    authFetch('/api/kpis/air_freight'),
    authFetch('/api/kpis/extra/logistics-vs-prod'),
  ]);

  return {
    logistic_cost: normalizeRecords(logisticCost),
    air_freight: normalizeRecords(airFreight),
    logistics_vs_prod: normalizeRecords(logisticsVsProd),
  };
}

export { UnauthorizedError };
