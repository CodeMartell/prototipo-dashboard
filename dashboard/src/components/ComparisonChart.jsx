import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatPercent, formatCurrency } from '../utils/formatters';
import { calculateVariation } from '../data/mockData';

const formatValue = (val, unit) => {
  if (val === undefined || val === null) return '—';
  if (unit === '%' || unit === 'Ratio') return formatPercent(val);
  if (unit === 'MUSD') return formatCurrency(val);
  return val;
};

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;

  const variation = calculateVariation(data.currentResult, data.previousResult);

  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip__title">{label}</div>
      
      <div className="custom-tooltip__row">
        <span className="custom-tooltip__label">
          <span className="custom-tooltip__dot" style={{ background: '#3b82f6' }}></span>
          Atual (2026)
        </span>
        <span className="custom-tooltip__value">{formatValue(data.currentResult, unit)}</span>
      </div>
      
      <div className="custom-tooltip__row">
        <span className="custom-tooltip__label">
          <span className="custom-tooltip__dot" style={{ background: '#8b5cf6' }}></span>
          Anterior (2025)
        </span>
        <span className="custom-tooltip__value">{formatValue(data.previousResult, unit)}</span>
      </div>

      {data.target !== undefined && data.target !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">
            <span className="custom-tooltip__dot" style={{ background: '#10b981' }}></span>
            Target
          </span>
          <span className="custom-tooltip__value">{formatValue(data.target, unit)}</span>
        </div>
      )}

      {data.currentAchievement !== undefined && data.currentAchievement !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">Atingimento</span>
          <span className="custom-tooltip__value">{(data.currentAchievement * 100).toFixed(0)}%</span>
        </div>
      )}

      {variation !== null && (
        <div className="custom-tooltip__variation" style={{ color: variation > 0 ? 'var(--danger)' : 'var(--success)' }}>
          Variação YoY: {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function CustomLegend({ accentColor, lineColor, targetColor, hasTarget }) {
  return (
    <div className="custom-legend">
      <div className="custom-legend__item">
        <div className="custom-legend__marker--bar" style={{ background: accentColor }}></div>
        <span>2026 (Realizado)</span>
      </div>
      <div className="custom-legend__item">
        <div className="custom-legend__marker" style={{ background: lineColor }}></div>
        <span>2025 (Ano Anterior)</span>
      </div>
      {hasTarget && (
        <div className="custom-legend__item">
          <div className="custom-legend__marker--dashed" style={{ borderColor: targetColor }}></div>
          <span>Target</span>
        </div>
      )}
    </div>
  );
}

export default function ComparisonChart({
  data,
  unit,
  accentColor = '#3b82f6',
  lineColor = '#8b5cf6',
  targetColor = '#10b981',
}) {
  const formatYAxis = (val) => {
    if (unit === '%' || unit === 'Ratio') return `${(val * 100).toFixed(1)}%`;
    if (unit === 'MUSD') return `$${val.toFixed(1)}M`;
    return val;
  };

  const hasTarget = data.some(d => d.target !== undefined && d.target !== null);

  // Filter out future months with no data
  const chartData = data.filter(d => d.currentResult !== null || d.previousResult !== null);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '360px', paddingBottom: '8px' }}>
      <div style={{ flex: 1, minHeight: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(148, 163, 184, 0.08)"
            />
            <XAxis
              dataKey="period"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip unit={unit} />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            />

            <Bar dataKey="currentResult" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => {
                let fill = accentColor;
                if (entry.isBest) fill = '#fbbf24';
                if (entry.isWorst) fill = '#ef4444';
                return <Cell key={`cell-${index}`} fill={fill} fillOpacity={entry.currentResult === null ? 0 : 0.85} />;
              })}
            </Bar>

            <Line
              type="monotone"
              dataKey="previousResult"
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              connectNulls={false}
            />

            {hasTarget && (
              <Line
                type="stepAfter"
                dataKey="target"
                stroke={targetColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={true}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend
        accentColor={accentColor}
        lineColor={lineColor}
        targetColor={targetColor}
        hasTarget={hasTarget}
      />
    </div>
  );
}
