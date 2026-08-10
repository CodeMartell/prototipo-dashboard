import React from 'react';
import { formatPercent, formatCurrency } from '../utils/formatters';
import { CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export default function KPIComparisonMatrix({
  selectedSubPeriod,
  selectedYear,
  comparisonMode,
  logCostInfo,
  airFreightInfo,
  logVsProdInfo,
}) {
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${parseInt(selectedYear.substring(1)) - 1}`;

  const formatVal = (val, unit) => {
    if (val === null || val === undefined) return '—';
    if (unit === '%' || unit === 'Ratio') return formatPercent(val);
    if (unit === 'MUSD') return formatCurrency(val);
    if (unit === 'achievement') return `${(val * 100).toFixed(0)}%`;
    return val;
  };

  const getStatusBadge = (real, target, lowerIsBetter = true) => {
    if (target === null || target === undefined || real === null || real === undefined) {
      return <span className="matrix-status neutral"><Minus size={12} /> N/A</span>;
    }
    const isGood = lowerIsBetter ? real <= target : real >= target;
    if (isGood) {
      return (
        <span className="matrix-status positive">
          <CheckCircle2 size={12} /> DENTRO DA META
        </span>
      );
    }
    return (
      <span className="matrix-status negative">
        <AlertTriangle size={12} /> ACIMA DA META
      </span>
    );
  };

  const metrics = [
    {
      key: 'logCost',
      name: 'Custo Logístico Total (War Room)',
      unit: '%',
      lowerIsBetter: true,
      current: logCostInfo.latest,
      target: logCostInfo.target,
      previous: logCostInfo.prevValue,
      achievement: logCostInfo.achievement,
      variationAbs: logCostInfo.variationAbs,
      variationYoY: logCostInfo.variation,
    },
    {
      key: 'airFreight',
      name: 'Air Freight KPI TV',
      unit: '%',
      lowerIsBetter: true,
      current: airFreightInfo.latest,
      target: airFreightInfo.target,
      previous: airFreightInfo.prevValue,
      achievement: airFreightInfo.achievement,
      variationAbs: airFreightInfo.variationAbs,
      variationYoY: airFreightInfo.variation,
    },
    {
      key: 'logVsProd',
      name: 'Logistics Cost x Product Amount',
      unit: 'Ratio',
      lowerIsBetter: true,
      current: logVsProdInfo.latest,
      target: null,
      previous: logVsProdInfo.prevValue,
      achievement: null,
      variationAbs: logVsProdInfo.variationAbs,
      variationYoY: logVsProdInfo.variation,
    },
  ];

  return (
    <div className="kpi-matrix-panel animate-fade-in">
      <div className="kpi-matrix-header">
        <div>
          <h3 className="kpi-matrix-title">Matriz Comparativa de KPIs — Visão Clara dos Indicadores</h3>
          <p className="kpi-matrix-subtitle">
            Verificação detalhada de resultados do período <strong>{selectedSubPeriod} ({currentYearLabel})</strong> contra Meta Oficial e Ano Anterior ({prevYearLabel}).
          </p>
        </div>
      </div>

      <div className="kpi-matrix-table-container">
        <table className="kpi-matrix-table">
          <thead>
            <tr>
              <th>Indicador / Métrica</th>
              <th>Realizado ({selectedSubPeriod}/{currentYearLabel.substring(2)})</th>
              <th>Meta (Target)</th>
              <th>Atingimento (%)</th>
              <th>Anterior ({selectedSubPeriod}/{prevYearLabel.substring(2)})</th>
              <th>Desvio Absoluto</th>
              <th>Variação YoY (%)</th>
              <th>Status do Período</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}>
                <td className="matrix-cell-name">
                  <strong>{m.name}</strong>
                </td>
                <td className="matrix-cell-highlight">{formatVal(m.current, m.unit)}</td>
                <td>{formatVal(m.target, m.unit)}</td>
                <td>
                  {m.achievement !== null ? (
                    <span className={`achievement-pill ${m.achievement >= 1 ? 'good' : 'alert'}`}>
                      {(m.achievement * 100).toFixed(0)}%
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatVal(m.previous, m.unit)}</td>
                <td>
                  {m.variationAbs !== null ? (
                    <span className={m.variationAbs > 0 ? (m.lowerIsBetter ? 'text-danger' : 'text-success') : (m.lowerIsBetter ? 'text-success' : 'text-danger')}>
                      {m.variationAbs > 0 ? '+' : ''}{formatVal(m.variationAbs, m.unit)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {m.variationYoY !== null ? (
                    <span className={`variation-badge ${m.variationYoY > 0 ? (m.lowerIsBetter ? 'negative' : 'positive') : (m.lowerIsBetter ? 'positive' : 'negative')}`}>
                      {m.variationYoY > 0 ? '+' : ''}{m.variationYoY.toFixed(1)}%
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{getStatusBadge(m.current, m.target, m.lowerIsBetter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
