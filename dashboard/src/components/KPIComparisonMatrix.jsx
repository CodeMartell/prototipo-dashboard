import React from 'react';
import {
  formatMetricValue,
  formatTargetAchievement,
  getAchievementStatusClass,
} from '../utils/formatters';

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

  const renderAchievement = (value, metric) => {
    // Incidental Cost não tem semáforo (noTrafficLight)
    if (metric?.noTrafficLight) return '—';
    // Resin Consolidation e Task Cost Reduction não têm target definido
    if (metric?.name === 'Resin Consolidation' || metric?.name === 'Task Cost Reduction') return '—';

    if (value === null || value === undefined) return '—';
    const num = Number(value);
    const pct = num <= 1 && num > 0 ? num * 100 : num;
    const formatted = formatTargetAchievement(pct);

    // Demurrage: target = 0 → qualquer resultado > 0 é vermelho
    let status;
    if (metric?.key === 'demurrage') {
      status = pct === 0 || (metric.prevAchievement === 0 && value === 0) ? 'good' : 'critical';
    } else {
      status = getAchievementStatusClass(pct, metric?.lowerIsBetter, metric?.alwaysGoodStatus);
    }

    return (
      <span className={`achievement-pill ${status}`}>
        {formatted}
      </span>
    );
  };

  const renderTarget = (metric, value) => {
    if (metric?.name === 'Resin Consolidation') return '—';
    if (metric?.noTrafficLight) return '—';
    return formatMetricValue(value, metric?.unit);
  };

  return (
    <div className="kpi-matrix-panel animate-fade-in">
      <div className="kpi-matrix-header">
        <h3 className="kpi-matrix-title">KPI Comparison Matrix — Clear View of Indicators</h3>
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
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <tr key={m.key}>
                  <td className="matrix-cell-name">
                    {Icon ? (
                      <Icon
                        size={14}
                        style={{ color: m.color, marginRight: '6px', verticalAlign: 'middle', flexShrink: 0 }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="matrix-cell-dot" aria-hidden="true" />
                    )}
                    <strong>{m.name}</strong>
                  </td>

                  <td className="matrix-cell--past">{formatMetricValue(m.prevValue, m.unit)}</td>
                  <td className="matrix-cell--past">{renderTarget(m, m.prevTarget)}</td>
                  <td className="matrix-cell--past">{renderAchievement(m.prevAchievement, m)}</td>

                  <td className="matrix-cell--current matrix-cell-highlight">{formatMetricValue(m.latest, m.unit)}</td>
                  <td className="matrix-cell--current">{renderTarget(m, m.target)}</td>
                  <td className="matrix-cell--current">{renderAchievement(m.achievement, m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
