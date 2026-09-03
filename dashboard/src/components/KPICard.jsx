import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { formatMetricValue } from '../utils/formatters';

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

  const getVariationClass = () => {
    if (variation === null || variation === undefined) return 'neutral';
    if (lowerIsBetter) return variation <= 0 ? 'positive' : 'negative';
    return variation >= 0 ? 'positive' : 'negative';
  };

  const variationClass = getVariationClass();

  const VariationIcon = () => {
    if (variation === null || variation === undefined) return <Minus size={12} />;
    if (variationClass === 'positive') {
      return lowerIsBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />;
    }
    return lowerIsBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const isClickable = typeof onClick === 'function';

  // Cartao clicavel precisa ser alcancavel por teclado, nao so por mouse.
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
        <div className="kpi-card__value">{formatValue(currentValue)}</div>
        {targetValue !== null && targetValue !== undefined && (
          <div className="kpi-card__target-badge" title="Target for selected period">
            Target: {formatValue(targetValue)}
          </div>
        )}
      </div>

      <div className="kpi-card__badges">
        {variation !== null && variation !== undefined ? (
          <span className={`kpi-card__variation ${variationClass}`}>
            <VariationIcon />
            {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
          </span>
        ) : (
          <span className="kpi-card__variation neutral">
            <Minus size={12} /> No variation
          </span>
        )}
        {achievement !== null && achievement !== undefined && (
          <span className={`achievement-pill ${achievement >= 1 ? 'good' : 'alert'}`} title="Target achievement for period">
            {(achievement * 100).toFixed(0)}%
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
          <span>Previous period ({previousLabel}):</span> <strong>{formatValue(previousValue)}</strong>
          {variationAbsolute !== null && variationAbsolute !== undefined && (
            <span className="kpi-card__diff">
              {' '}· Deviation {variationAbsolute > 0 ? '+' : ''}{formatValue(variationAbsolute)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
