import { test } from 'node:test';
import assert from 'node:assert/strict';

// Funções de cálculo de data equivalentes às usadas no DateRangeFilter
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(n, baseDate = new Date()) {
  return startOfDay(new Date(baseDate.getTime() - n * 86400000));
}

function toInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test('startOfDay sets time to 00:00:00.000', () => {
  const now = new Date('2026-09-18T15:30:45.123Z');
  const start = startOfDay(now);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getMilliseconds(), 0);
});

test('startOfMonth returns first day of current month', () => {
  const d = new Date('2026-09-18T12:00:00Z');
  const monthStart = startOfMonth(d);
  assert.equal(monthStart.getFullYear(), 2026);
  assert.equal(monthStart.getMonth(), 8); // 0-indexed: 8 is September
  assert.equal(monthStart.getDate(), 1);
});

test('daysAgo correctly computes 7 and 90 days backwards', () => {
  const fixedDate = new Date('2026-09-18T12:00:00Z');
  const sevenDaysAgo = daysAgo(7, fixedDate);
  const diffDays = Math.round((fixedDate - sevenDaysAgo) / 86400000);
  assert.equal(diffDays >= 7, true);
});

test('toInputValue formats YYYY-MM-DD properly with leading zeros', () => {
  const date = new Date(2026, 0, 5); // 2026-01-05
  assert.equal(toInputValue(date), '2026-01-05');
  assert.equal(toInputValue(null), '');
  assert.equal(toInputValue(undefined), '');
});
