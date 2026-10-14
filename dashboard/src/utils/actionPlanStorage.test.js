import test from 'node:test';
import assert from 'node:assert/strict';

import { addActionPlan, getActionPlans, removeActionPlan } from './actionPlanStorage.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test('stores more than one action plan for the same KPI period', () => {
  const storage = new MemoryStorage();
  addActionPlan('totalCost', 'Y26', 'Jan', 'Primeiro plano', storage, '2026-01-01T10:00:00Z', 'plan-1');
  addActionPlan('totalCost', 'Y26', 'Jan', 'Segundo plano', storage, '2026-01-01T11:00:00Z', 'plan-2');

  const plans = getActionPlans('totalCost', 'Y26', storage);
  assert.equal(plans.length, 2);
  assert.deepEqual(plans.map((plan) => plan.notes), ['Primeiro plano', 'Segundo plano']);
});

test('removes only the selected action plan', () => {
  const storage = new MemoryStorage();
  addActionPlan('totalCost', 'Y26', 'Jan', 'Manter', storage, '2026-01-01T10:00:00Z', 'plan-1');
  addActionPlan('totalCost', 'Y26', 'Jan', 'Remover', storage, '2026-01-01T11:00:00Z', 'plan-2');

  const [, planToRemove] = getActionPlans('totalCost', 'Y26', storage);
  removeActionPlan('totalCost', 'Y26', planToRemove, storage);

  const plans = getActionPlans('totalCost', 'Y26', storage);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].notes, 'Manter');
});

test('keeps legacy single-plan records visible', () => {
  const storage = new MemoryStorage();
  storage.setItem('ap_totalCost_Y26_Jan', 'Plano existente');
  storage.setItem('ap_updated_totalCost_Y26_Jan', '2026-01-01T09:00:00Z');

  const plans = getActionPlans('totalCost', 'Y26', storage);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].notes, 'Plano existente');
  assert.equal(plans[0].legacy, true);
});
