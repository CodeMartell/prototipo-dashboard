import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { formatPercent, formatCurrency } from '../utils/formatters';

const VARIANT_COLORS = {
  logistic: '#3b82f6',
  airfreight: '#14b8a6',
  production: '#8b5cf6',
};

export default function KPICard({
  title,
  variant,
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
  const color = VARIANT_COLORS[variant] || '#3b82f6';

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (unit === '%' || unit === 'Ratio') return formatPercent(val);
    if (unit === 'MUSD') return formatCurrency(val);
    if (unit === 'achievement') return `${(val * 100).toFixed(0)}%`;
    return val;
  };

  // Variation direction: for "lower is better", decrease = good (positive badge)
  const getVariationClass = () => {
    if (variation === null || variation === undefined) return 'neutral';
    if (lowerIsBetter) return variation <= 0 ? 'positive' : 'negative';
    return variation >= 0 ? 'positive' : 'negative';
  };

  const variationClass = getVariationClass();

  // Arrow icon based on improvement direction
  const VariationIcon = () => {
    if (variation === null || variation === undefined) return <Minus size={12} />;
    if (variationClass === 'positive') {
      return lowerIsBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />;
    }
    return lowerIsBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  return (
    <div className="kpi-card animate-fade-in" onClick={onClick}>
      <div className="kpi-card__label">{title}</div>

      <div className="kpi-card__value">{formatValue(currentValue)}</div>

      <div className="kpi-card__badges">
        {variation !== null && variation !== undefined ? (
          <>
            <span className={`kpi-card__variation ${variationClass}`}>
              <VariationIcon />
              {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
            </span>
            {variationAbsolute !== null && variationAbsolute !== undefined && (
              <span className="kpi-card__diff">
                {variationAbsolute > 0 ? '+' : ''}{formatValue(variationAbsolute)}
              </span>
            )}
          </>
        ) : (
          <span className="kpi-card__variation neutral">
            <Minus size={12} /> — 
          </span>
        )}
      </div>

      <div className="kpi-card__sparkline">
        {sparklineData && sparklineData.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`sparkGrad-${variant}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#sparkGrad-${variant})`}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {previousLabel && (
        <div className="kpi-card__prev">
          {previousLabel}: <strong>{formatValue(previousValue)}</strong>
        </div>
      )}
    </div>
  );
}
