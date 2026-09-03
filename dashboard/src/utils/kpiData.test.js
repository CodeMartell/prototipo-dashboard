import test from 'node:test';
import assert from 'node:assert/strict';

import { aggregateRatio, buildQuarterlySeries } from './kpiData.js';

test('Incidental Cost aggregates cost and production before calculating the ratio', () => {
  const rows = [
    { logisticsCost: 10, productionAmount: 100, ratio: 0.1 },
    { logisticsCost: 90, productionAmount: 300, ratio: 0.3 },
  ];

  assert.equal(aggregateRatio(rows), 0.25);
});

test('Incidental Cost quarterly result uses the weighted ratio', () => {
  const quarterly = buildQuarterlySeries(
    [
      { month: 'Jan', year: 'Y26', logisticsCost: 10, productionAmount: 100, ratio: 0.1 },
      { month: 'Feb', year: 'Y26', logisticsCost: 90, productionAmount: 300, ratio: 0.3 },
    ],
    { aggregate: 'avg', valueKey: 'ratio' }
  );

  assert.equal(quarterly.length, 1);
  assert.equal(quarterly[0].logisticsCost, 100);
  assert.equal(quarterly[0].productionAmount, 400);
  assert.equal(quarterly[0].ratio, 0.25);
});
