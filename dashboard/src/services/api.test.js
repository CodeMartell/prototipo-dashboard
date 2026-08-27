import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDashboardData, login, logout, getToken, getCurrentUser, UnauthorizedError } from './api.js';
import { canAccessAnalytics } from './permissions.js';

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

test('logistics vs production maps FastAPI fields to the React contract, preserving zero', async () => {
  globalThis.fetch = async (path) => Response.json(path.endsWith('logistics-vs-prod')
    ? [{ month: 'Jan', year: '2026', logistics_cost: 0, production_amount: 25, ratio: 0 }]
    : []);
  const data = await fetchDashboardData();
  assert.deepEqual(data.logistic_cost, []);
  assert.deepEqual(data.air_freight, []);
  const record = data.logistics_vs_prod[0];
  assert.equal(record.logisticsCost, 0);
  assert.equal(record.productionAmount, 25);
  assert.equal(record.ratio, 0);
  assert.equal(record.year, 'Y26');
});

test('dashboard calls all endpoints with token and normalizes years', async () => {
  localStorage.setItem('datalens_token', 'test-token');
  const paths = [];
  globalThis.fetch = async (path, options) => {
    paths.push(path);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json([{ month: 'Jan', year: '2026', result: 0.05 }, { month: 'Feb', year: 'Y25', result: 0.03 }]);
  };
  const data = await fetchDashboardData();
  assert.deepEqual(paths.sort(), ['/api/kpis/air_freight', '/api/kpis/extra/logistics-vs-prod', '/api/kpis/logistic_cost']);
  for (const rows of Object.values(data)) {
    assert.equal(rows[0].year, 'Y26');
    assert.equal(rows[1].year, 'Y25');
    assert.equal(rows[0].result, 0.05);
  }
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
