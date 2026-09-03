import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteKpiRecord,
  fetchDashboardData,
  getCurrentUser,
  getToken,
  login,
  logout,
  saveKpiRecord,
  saveLogisticsVsProd,
  UnauthorizedError,
} from './api.js';
import { canAccessAnalytics, canEditKpiData } from './permissions.js';

const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
beforeEach(() => {
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  } });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

test('login sends credentials and loads the authenticated user', async () => {
  const calls = [];
  const user = { id: 'test', email: 'test@example.com', role: 'ADMIN' };
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return Response.json(path.endsWith('/login') ? { access_token: 'test-token' } : user);
  };
  assert.deepEqual(await login(user.email, 'test-password'), user);
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: user.email, password: 'test-password' });
  assert.equal(calls[1].path, '/api/auth/me');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  assert.equal(getToken(), 'test-token');
  assert.deepEqual(getCurrentUser(), user);
  logout();
  assert.equal(getToken(), null);
  assert.equal(getCurrentUser(), null);
});

test('invalid credentials do not create a session', async () => {
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(login('test@example.com', 'wrong'), /inválidos/);
  assert.equal(getToken(), null);
});

for (const failure of ['unauthorized', 'server', 'network', 'invalid-user', 'invalid-token']) {
  test(`failed login leaves no partial or previous session: ${failure}`, async () => {
    localStorage.setItem('datalens_token', 'previous-token');
    localStorage.setItem('datalens_user', JSON.stringify({ id: 'previous-user' }));
    globalThis.fetch = async (path) => {
      if (path.endsWith('/login')) {
        return Response.json(failure === 'invalid-token' ? {} : { access_token: 'new-token' });
      }
      assert.equal(getToken(), null);
      if (failure === 'network') throw new TypeError('network failure');
      if (failure === 'invalid-user') return Response.json({});
      return Response.json({}, { status: failure === 'unauthorized' ? 401 : 500 });
    };
    await assert.rejects(login('test@example.com', 'password'));
    assert.equal(getToken(), null);
    assert.equal(getCurrentUser(), null);
  });
}

const KPI_KEYS = [
  'logistic_cost',
  'air_freight',
  'incidental_cost',
  'total_cost',
  'demurrage',
];

/** Resposta de GET /api/kpis/dashboard com as mesmas linhas em cada indicador. */
function dashboardPayload(rows, logisticsVsProdRows = []) {
  const payload = Object.fromEntries(KPI_KEYS.map((key) => [key, rows]));
  payload.logistics_vs_prod = logisticsVsProdRows;
  return payload;
}

test('logistics vs production maps FastAPI fields to the React contract, preserving zero', async () => {
  globalThis.fetch = async () => Response.json(
    dashboardPayload([], [{ month: 'Jan', year: '2026', logistics_cost: 0, production_amount: 25, ratio: 0 }])
  );
  const data = await fetchDashboardData();
  assert.deepEqual(data.logistic_cost, []);
  assert.deepEqual(data.air_freight, []);
  const record = data.logistics_vs_prod[0];
  assert.equal(record.logisticsCost, 0);
  assert.equal(record.productionAmount, 25);
  assert.equal(record.ratio, 0);
  assert.equal(record.year, 'Y26');
});

test('dashboard loads every indicator in a single call and normalizes years', async () => {
  localStorage.setItem('datalens_token', 'test-token');
  const paths = [];
  const rows = [
    { month: 'Jan', year: '2026', result: 0.05 },
    { month: 'Feb', year: 'Y25', result: 0.03 },
  ];
  globalThis.fetch = async (path, options) => {
    paths.push(path);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json(dashboardPayload(rows, rows));
  };
  const data = await fetchDashboardData();
  assert.deepEqual(paths, ['/api/kpis/dashboard']);
  assert.deepEqual(Object.keys(data).sort(), [...KPI_KEYS, 'logistics_vs_prod'].sort());
  for (const kpiRows of Object.values(data)) {
    assert.equal(kpiRows[0].year, 'Y26');
    assert.equal(kpiRows[1].year, 'Y25');
    assert.equal(kpiRows[0].result, 0.05);
  }
});

test('manual entry writes to the period route and keeps percent values as fractions', async () => {
  localStorage.setItem('datalens_token', 'test-token');
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({
      path,
      method: options.method,
      body: options.body ? JSON.parse(options.body) : null,
    });
    return Response.json({});
  };

  await saveKpiRecord('logistic_cost', { year: 'Y26', month: 'Sep', target: 0.042, result: 0.039 });
  assert.equal(calls[0].path, '/api/kpis/logistic_cost/Y26/Sep');
  assert.equal(calls[0].method, 'PUT');
  assert.deepEqual(calls[0].body, { target: 0.042, result: 0.039, achievement: null });

  // Ano em formato longo é convertido para o formato que o banco usa.
  await saveLogisticsVsProd({ year: '2026', month: 'Sep', logisticsCost: 2.5, productionAmount: 50 });
  assert.equal(calls[1].path, '/api/kpis/extra/logistics-vs-prod/Y26/Sep');
  assert.deepEqual(calls[1].body, { logistics_cost: 2.5, production_amount: 50, ratio: null });

  await deleteKpiRecord('demurrage', { year: 'Y25', month: 'Jan' });
  assert.equal(calls[2].path, '/api/kpis/demurrage/Y25/Jan');
  assert.equal(calls[2].method, 'DELETE');
});

test('expired session clears storage', async () => {
  localStorage.setItem('datalens_token', 'expired');
  localStorage.setItem('datalens_user', '{}');
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(fetchDashboardData(), UnauthorizedError);
  assert.equal(getToken(), null);
  assert.equal(getCurrentUser(), null);
});

test('server and network errors propagate instead of returning empty success', async () => {
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(fetchDashboardData(), /503/);
  globalThis.fetch = async () => { throw new TypeError('network failure'); };
  await assert.rejects(fetchDashboardData(), /network failure/);
});

test('analytics is available only to ADMIN', () => {
  assert.equal(canAccessAnalytics({ role: 'ADMIN' }), true);
  assert.equal(canAccessAnalytics({ role: 'VISUALIZADOR' }), false);
  assert.equal(canAccessAnalytics(null), false);
});

test('manual entry is available only to ADMIN', () => {
  assert.equal(canEditKpiData({ role: 'ADMIN' }), true);
  assert.equal(canEditKpiData({ role: 'VISUALIZADOR' }), false);
  assert.equal(canEditKpiData(null), false);
});
