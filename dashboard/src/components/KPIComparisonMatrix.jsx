import React from 'react';
import { formatMetricValue } from '../utils/formatters';

const PERIOD_NOUN = {
  monthly: 'Month',
  quarterly: 'Quarter',
  semiannual: 'Semester',
  annual: 'Year',
};

export default function KPIComparisonMatrix({
  periodType = 'monthly',
  selectedSubPeriod,
  selectedYear,
  metrics = [],
}) {
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${parseInt(selectedYear.substring(1)) - 1}`;

  const isAnnual = periodType === 'annual';
  const currentPeriodLabel = isAnnual ? currentYearLabel : `${selectedSubPeriod}/${currentYearLabel.substring(2)}`;
  const prevPeriodLabel = isAnnual ? prevYearLabel : `${selectedSubPeriod}/${prevYearLabel.substring(2)}`;
  const periodNoun = PERIOD_NOUN[periodType] || 'Period';

  const renderAchievement = (value) => {
    if (value === null || value === undefined) return '—';
    const status = value >= 1 ? 'good' : value >= 0.8 ? 'alert' : 'critical';
    return (
      <span className={`achievement-pill ${status}`}>
        {(value * 100).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="kpi-matrix-panel animate-fade-in">
      <div className="kpi-matrix-header">
        <div>
          <h3 className="kpi-matrix-title">KPI Comparison Matrix — Clear View of Indicators</h3>
          <p className="kpi-matrix-subtitle">
            Previous {periodNoun.toLowerCase()} (<strong>{prevPeriodLabel}</strong>) versus current {periodNoun.toLowerCase()} (
            <strong>{currentPeriodLabel}</strong>): actual, target, and achievement across periods.
          </p>
        </div>
      </div>

      <div className="kpi-matrix-table-container">
        <table className="kpi-matrix-table">
          <thead>
            <tr className="kpi-matrix-table__group-row">
              <th rowSpan={2}>Indicator / Metric</th>
              <th colSpan={3} className="matrix-group matrix-group--past">
                Past {periodNoun} ({prevPeriodLabel})
              </th>
              <th colSpan={3} className="matrix-group matrix-group--current">
                Current {periodNoun} ({currentPeriodLabel})
              </th>
            </tr>
            <tr>
              <th className="matrix-group--past">Actual</th>
              <th className="matrix-group--past">Target</th>
              <th className="matrix-group--past">Achievement</th>
              <th className="matrix-group--current">Actual</th>
              <th className="matrix-group--current">Target</th>
              <th className="matrix-group--current">Achievement</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}>
                <td className="matrix-cell-name">
                  <span className="matrix-cell-dot" aria-hidden="true" />
                  <strong>{m.name}</strong>
                </td>

                <td className="matrix-cell--past">{formatMetricValue(m.prevValue, m.unit)}</td>
                <td className="matrix-cell--past">{formatMetricValue(m.prevTarget, m.unit)}</td>
                <td className="matrix-cell--past">{renderAchievement(m.prevAchievement)}</td>

                <td className="matrix-cell-highlight">{formatMetricValue(m.latest, m.unit)}</td>
                <td>{formatMetricValue(m.target, m.unit)}</td>
                <td>{renderAchievement(m.achievement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
