import React from 'react';
import {
  formatMetricValue,
  formatTargetAchievement,
  getAchievementStatusClass,
} from '../utils/formatters';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  const currentYearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${parseInt(selectedYear.substring(1)) - 1}`;

  const isAnnual = periodType === 'annual';
  const currentPeriodLabel = isAnnual ? currentYearLabel : `${t(`months.${selectedSubPeriod}`, selectedSubPeriod)}/${currentYearLabel.substring(2)}`;
  const prevPeriodLabel = isAnnual ? prevYearLabel : `${t(`months.${selectedSubPeriod}`, selectedSubPeriod)}/${prevYearLabel.substring(2)}`;
  const periodNoun = t(`matrix.noun_${periodType}`);

  const renderAchievement = (value, metric, actualValue) => {
    // Incidental Cost não tem semáforo (noTrafficLight)
    if (metric?.noTrafficLight) return '—';
    // Resin Consolidation não utiliza meta/atingimento no painel.
    if (metric?.name === 'Resin Consolidation') return '—';

    if (value === null || value === undefined) return '—';
    const num = Number(value);
    const pct = num <= 2 && num > 0 ? num * 100 : num;
    const formatted = formatTargetAchievement(pct);

    const status = getAchievementStatusClass(
      pct,
      metric?.lowerIsBetter,
      metric?.alwaysGoodStatus,
      {
        targetIsZero: metric?.targetIsZero,
        noTrafficLight: metric?.noTrafficLight,
        resultValue: actualValue,
      }
    );

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
        <h3 className="kpi-matrix-title">{t('kpi.matrix_title')}</h3>
      </div>

      <div className="kpi-matrix-table-container">
        <table className="kpi-matrix-table">
          <thead>
            <tr className="kpi-matrix-table__group-row">
              <th rowSpan={2}>{t('matrix.indicator')}</th>
              <th colSpan={3} className="matrix-group matrix-group--past">
                {t('matrix.past')} {periodNoun} ({prevPeriodLabel})
              </th>
              <th colSpan={3} className="matrix-group matrix-group--current">
                {t('matrix.current')} {periodNoun} ({currentPeriodLabel})
              </th>
            </tr>
            <tr>
              <th className="matrix-group--past">{t('matrix.actual')}</th>
              <th className="matrix-group--past">{t('matrix.target')}</th>
              <th className="matrix-group--past">{t('matrix.achievement')}</th>
              <th className="matrix-group--current">{t('matrix.actual')}</th>
              <th className="matrix-group--current">{t('matrix.target')}</th>
              <th className="matrix-group--current">{t('matrix.achievement')}</th>
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
                    <strong>{t(`nav.${m.key}`)}</strong>
                  </td>

                  <td className="matrix-cell--past">{formatMetricValue(m.prevValue, m.unit)}</td>
                  <td className="matrix-cell--past">{renderTarget(m, m.prevTarget)}</td>
                  <td className="matrix-cell--past">{renderAchievement(m.prevAchievement, m, m.prevValue)}</td>

                  <td className="matrix-cell--current matrix-cell-highlight">{formatMetricValue(m.latest, m.unit)}</td>
                  <td className="matrix-cell--current">{renderTarget(m, m.target)}</td>
                  <td className="matrix-cell--current">{renderAchievement(m.achievement, m, m.latest)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
