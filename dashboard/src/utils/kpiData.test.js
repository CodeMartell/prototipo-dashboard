import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeWarRoomRows,
  toDisplayValue,
  calculateVariation,
  calculateDeviation,
  calculateTargetAchievement,
  buildQuarterlySeries,
  aggregateField,
  aggregateRatio,
} from './kpiData.js';

import {
  formatVariation,
  formatDeviation,
  formatTargetAchievement,
  getAchievementStatusClass,
} from './formatters.js';

test('War Room hides unavailable targets before Y26', () => {
  const rows = normalizeWarRoomRows([
    { month: 'Jan', year: 'Y24', target: 0, result: 0.04, achievement: 0 },
    { month: 'Jan', year: 'Y25', target: 0, result: 0.05, achievement: 0 },
    { month: 'Jan', year: 'Y26', target: 0.04, result: 0.03, achievement: 1.3333 },
  ]);

  assert.equal(rows[0].target, null);
  assert.equal(rows[0].achievement, null);
  assert.equal(rows[1].target, null);
  assert.equal(rows[2].target, 0.04);
  assert.equal(rows[2].achievement, 1.3333);
});

test('toDisplayValue correctly converts raw numbers according to unit', () => {
  assert.equal(toDisplayValue(0.053794, '%'), 5.38);
  assert.equal(toDisplayValue(0.053356, '%'), 5.34);
  assert.equal(toDisplayValue(0.064800, '%'), 6.48);
  assert.equal(toDisplayValue(8.75, 'KUSD'), 8.75);
  assert.equal(toDisplayValue(null, '%'), null);
  assert.equal(toDisplayValue(undefined, '%'), null);
});

test('calculateVariation correctly handles positive, negative, zero and edge cases', () => {
  const variation = calculateVariation(5.38, 5.34);
  assert.ok(Math.abs(variation - 0.74906367) < 0.0001);
  assert.equal(formatVariation(variation), '+0.75%');

  const negativeVar = calculateVariation(5.30, 5.34);
  assert.equal(formatVariation(negativeVar), '-0.75%');

  const zeroVar = calculateVariation(5.34, 5.34);
  assert.equal(formatVariation(zeroVar), '0.00%');

  assert.equal(calculateVariation(5.38, 0), null);
  assert.equal(calculateVariation(5.38, null), null);
  assert.equal(calculateVariation(null, 5.34), null);
  assert.equal(formatVariation(null), null);
});

test('calculateDeviation and formatDeviation correctly format percentage and non-percentage units', () => {
  const dev1 = calculateDeviation(5.38, 5.34);
  assert.equal(Math.round(dev1 * 100) / 100, 0.04);
  assert.equal(formatDeviation(dev1, '%'), '+0.04 p.p.');

  const dev2 = calculateDeviation(5.30, 5.34);
  assert.equal(formatDeviation(dev2, '%'), '-0.04 p.p.');

  const dev3 = calculateDeviation(5.34, 5.34);
  assert.equal(formatDeviation(dev3, '%'), '0.00 p.p.');

  const devKUSD = calculateDeviation(8.75, 2.80);
  assert.equal(formatDeviation(devKUSD, 'KUSD'), '+$5.95K');

  const devCTNR = calculateDeviation(0, 3);
  assert.equal(formatDeviation(devCTNR, 'CTNR'), '-3 ctnr');

  assert.equal(calculateDeviation(null, 5.34), null);
  assert.equal(calculateDeviation(5.38, null), null);
  assert.equal(formatDeviation(null, '%'), null);
});

test('calculateTargetAchievement and getAchievementStatusClass follow the color rules', () => {
  const ach = calculateTargetAchievement(5.38, 6.48);
  assert.ok(Math.abs(ach - 83.02469) < 0.001);
  assert.equal(formatTargetAchievement(ach), '83.02%');
  assert.equal(getAchievementStatusClass(ach), 'critical');

  const achGood = calculateTargetAchievement(6.50, 6.48);
  assert.equal(formatTargetAchievement(achGood), '100.31%');
  assert.equal(getAchievementStatusClass(achGood), 'good');

  const achWarning = calculateTargetAchievement(6.00, 6.48);
  assert.equal(formatTargetAchievement(achWarning), '92.59%');
  assert.equal(getAchievementStatusClass(achWarning), 'alert');

  assert.equal(getAchievementStatusClass(100.0), 'good');
  assert.equal(getAchievementStatusClass(99.99), 'alert');
  assert.equal(getAchievementStatusClass(90.0), 'alert');
  assert.equal(getAchievementStatusClass(89.99), 'critical');

  assert.equal(calculateTargetAchievement(5.38, 0), null);
  assert.equal(calculateTargetAchievement(5.38, null), null);
  assert.equal(calculateTargetAchievement(null, 6.48), null);
  assert.equal(formatTargetAchievement(null), null);
  assert.equal(getAchievementStatusClass(null), 'neutral');
});

test('War Room Jan/26 Benchmark card metrics validation', () => {
  const rawCurrent = 0.05379432665941768;
  const rawPrevious = 0.05335571854222136;
  const rawTarget = 0.06480001706174597;
  const unit = '%';

  const currDisp = toDisplayValue(rawCurrent, unit);
  const prevDisp = toDisplayValue(rawPrevious, unit);
  const targetDisp = toDisplayValue(rawTarget, unit);

  assert.equal(currDisp, 5.38);
  assert.equal(prevDisp, 5.34);
  assert.equal(targetDisp, 6.48);

  const variation = calculateVariation(currDisp, prevDisp);
  const deviation = calculateDeviation(currDisp, prevDisp);
  const achievement = calculateTargetAchievement(currDisp, targetDisp);

  assert.equal(formatVariation(variation), '+0.75%');
  assert.equal(formatDeviation(deviation, unit), '+0.04 p.p.');
  assert.equal(formatTargetAchievement(achievement), '83.02%');
  assert.equal(getAchievementStatusClass(achievement), 'critical');
});

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

test('Trimestral, Semestral and Anual calculations use arithmetic mean for regular KPIs', () => {
  const q1Months = [
    { month: 'Jan', year: 'Y26', result: 5.0, target: 6.0 },
    { month: 'Feb', year: 'Y26', result: 6.0, target: 6.0 },
    { month: 'Mar', year: 'Y26', result: 7.0, target: 6.0 },
  ];
  const q1Avg = aggregateField(q1Months, 'result', 'avg');
  const q1TargetAvg = aggregateField(q1Months, 'target', 'avg');
  assert.equal(q1Avg, 6.0);
  assert.equal(q1TargetAvg, 6.0);

  const h1Months = [
    { month: 'Jan', year: 'Y26', result: 4.0 },
    { month: 'Feb', year: 'Y26', result: 5.0 },
    { month: 'Mar', year: 'Y26', result: 6.0 },
    { month: 'Apr', year: 'Y26', result: 7.0 },
    { month: 'May', year: 'Y26', result: 8.0 },
    { month: 'Jun', year: 'Y26', result: 9.0 },
  ];
  const h1Avg = aggregateField(h1Months, 'result', 'avg');
  assert.equal(h1Avg, 6.5);

  const yearMonths = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    year: 'Y26',
    result: 10 + i,
  }));
  const yearAvg = aggregateField(yearMonths, 'result', 'avg');
  assert.equal(yearAvg, 15.5);

  const quarterly = buildQuarterlySeries(q1Months, { valueKey: 'result' });
  assert.equal(quarterly.length, 1);
  assert.equal(quarterly[0].quarter, 'Q1');
  assert.equal(quarterly[0].result, 6.0);
  assert.equal(quarterly[0].target, 6.0);
});
