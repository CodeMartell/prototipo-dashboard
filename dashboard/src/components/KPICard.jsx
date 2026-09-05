import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import {
  formatMetricValue,
  formatVariation,
  formatDeviation,
  formatTargetAchievement,
  getAchievementStatusClass,
} from '../utils/formatters';
import {
  toDisplayValue,
  calculateVariation,
  calculateDeviation,
  calculateTargetAchievement,
} from '../utils/kpiData';

export default function KPICard({
  title,
  subPeriodLabel,
  color = '#3B82F6',
  currentValue,
  targetValue,
  achievement,
  variation,
  variationAbsolute,
  sparklineData,
  unit,
  lowerIsBetter,
  previousLabel,
  previousValue,
  onClick,
}) {
  const gradientId = `sparkGrad-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const formatValue = (val) => formatMetricValue(val, unit);

  // Valores normalizados para a unidade de exibição (ex: 0.0538 -> 5.38 para %)
  const currDisp = toDisplayValue(currentValue, unit);
  const prevDisp = toDisplayValue(previousValue, unit);
  const targetDisp = toDisplayValue(targetValue, unit);

  // Cálculos dinâmicos
  const calcVariation = variation !== undefined && variation !== null
    ? variation
    : calculateVariation(currDisp, prevDisp);

  const calcDeviation = variationAbsolute !== undefined && variationAbsolute !== null
    ? variationAbsolute
    : calculateDeviation(currDisp, prevDisp);

  const calcAchievement = achievement !== undefined && achievement !== null
    ? (achievement <= 1 && achievement > 0 && !String(achievement).includes('%') && targetDisp !== null
        ? calculateTargetAchievement(currDisp, targetDisp)
        : achievement)
    : calculateTargetAchievement(currDisp, targetDisp);

  const formattedVariation = formatVariation(calcVariation);
  const formattedDeviation = formatDeviation(calcDeviation, unit);
  const formattedAchievement = formatTargetAchievement(calcAchievement);
  let achievementStatusClass = getAchievementStatusClass(calcAchievement);

  // Regra específica para Resin Consolidation (lucro/saving = maior é melhor)
  if (title === 'Resin Consolidation' && calcAchievement !== null) {
    if (calcAchievement >= 100) achievementStatusClass = 'good'; // Verde
    else if (calcAchievement >= 90) achievementStatusClass = 'alert'; // Amarelo
    else achievementStatusClass = 'critical'; // Vermelho
  }

  const getVariationClass = () => {
    if (calcVariation === null || calcVariation === undefined) return 'neutral';
    if (Math.abs(calcVariation) < 0.000001 || calcVariation.toFixed(2) === '0.00') return 'neutral';
    if (lowerIsBetter) return calcVariation < 0 ? 'positive' : 'negative';
    return calcVariation > 0 ? 'positive' : 'negative';
  };

  const variationClass = getVariationClass();

  const VariationIcon = () => {
    if (calcVariation === null || calcVariation === undefined || variationClass === 'neutral') {
      return <Minus size={12} />;
    }
    if (variationClass === 'positive') {
      return lowerIsBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />;
    }
    return lowerIsBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const isClickable = typeof onClick === 'function';
  const hasCurrentData = currentValue !== null && currentValue !== undefined;

  // Cartão clicável precisa ser alcançável por teclado, não só por mouse.
  const handleKeyDown = (event) => {
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`kpi-card animate-fade-in${isClickable ? ' kpi-card--clickable' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open ${title} details` : undefined}
      style={{ borderTop: `2px solid ${color}` }}
    >
      <div className="kpi-card__top">
        <div className="kpi-card__label">{title}</div>
        {subPeriodLabel && <div className="kpi-card__period-tag">{subPeriodLabel}</div>}
      </div>

      <div className="kpi-card__value-row">
        <div className="kpi-card__value">
          {hasCurrentData ? formatValue(currentValue) : 'No data'}
        </div>
        {hasCurrentData && targetValue !== null && targetValue !== undefined && title !== 'Resin Consolidation' && (
          <div className="kpi-card__target-badge" title="Target for selected period">
            Target: {formatValue(targetValue)}
          </div>
        )}
      </div>

      <div className="kpi-card__badges">
        {!hasCurrentData ? (
          <span className="kpi-card__variation neutral">
            <Minus size={12} /> No data for selected period
          </span>
        ) : formattedVariation !== null ? (
          <span className={`kpi-card__variation ${variationClass}`}>
            <VariationIcon />
            {formattedVariation}
          </span>
        ) : (
          <span className="kpi-card__variation neutral">
            <Minus size={12} /> No variation
          </span>
        )}
        {formattedAchievement !== null && (
          <span className={`achievement-pill ${achievementStatusClass}`} title="Target achievement for period">
            {formattedAchievement}
          </span>
        )}
      </div>

      <div className="kpi-card__sparkline">
        {sparklineData && sparklineData.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#${gradientId})`}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {previousLabel && (
        <div className="kpi-card__prev">
          <span>Previous period ({previousLabel}):</span>{' '}
          <strong>
            {previousValue !== null && previousValue !== undefined
              ? formatValue(previousValue)
              : 'No data'}
          </strong>
          {formattedDeviation !== null && (
            <span className="kpi-card__diff">
              {' '}· Deviation {formattedDeviation}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
