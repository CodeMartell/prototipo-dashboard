import React from 'react';
import { formatMetricValue } from '../utils/formatters';

const PERIOD_NOUN = {
  monthly: 'Mês',
  quarterly: 'Trimestre',
  semiannual: 'Semestre',
  annual: 'Ano',
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
  const periodNoun = PERIOD_NOUN[periodType] || 'Período';

  const renderAchievement = (value) => {
    if (value === null || value === undefined) return '—';
    return (
      <span className={`achievement-pill ${value >= 1 ? 'good' : 'alert'}`}>
        {(value * 100).toFixed(0)}%
      </span>
    );
  };

  return (
    <div className="kpi-matrix-panel animate-fade-in">
      <div className="kpi-matrix-header">
        <div>
          <h3 className="kpi-matrix-title">Matriz Comparativa de KPIs — Visão Clara dos Indicadores</h3>
          <p className="kpi-matrix-subtitle">
            {periodNoun} passado (<strong>{prevPeriodLabel}</strong>) contra {periodNoun.toLowerCase()} atual (
            <strong>{currentPeriodLabel}</strong>): realizado, meta e atingimento em cada um dos períodos.
          </p>
        </div>
      </div>

      <div className="kpi-matrix-table-container">
        <table className="kpi-matrix-table">
          <thead>
            <tr className="kpi-matrix-table__group-row">
              <th rowSpan={2}>Indicador / Métrica</th>
              <th colSpan={3} className="matrix-group matrix-group--past">
                {periodNoun} Passado ({prevPeriodLabel})
              </th>
              <th colSpan={3} className="matrix-group matrix-group--current">
                {periodNoun} Atual ({currentPeriodLabel})
              </th>
            </tr>
            <tr>
              <th className="matrix-group--past">Realizado</th>
              <th className="matrix-group--past">Meta</th>
              <th className="matrix-group--past">Atingimento</th>
              <th className="matrix-group--current">Realizado</th>
              <th className="matrix-group--current">Target</th>
              <th className="matrix-group--current">Atingimento</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}>
                <td className="matrix-cell-name">
                  <span className="matrix-cell-dot" style={{ background: m.color }} />
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
