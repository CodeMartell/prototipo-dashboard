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
          <span className="custom-tooltip__dot" style={{ background: '#E7194A' }}></span>
          Atual (2026)
        </span>
        <span className="custom-tooltip__value">{formatValue(data.currentResult, unit)}</span>
      </div>
      
      <div className="custom-tooltip__row">
        <span className="custom-tooltip__label">
          <span className="custom-tooltip__dot" style={{ background: '#9E9E9E' }}></span>
          Anterior (2025)
        </span>
        <span className="custom-tooltip__value">{formatValue(data.previousResult, unit)}</span>
      </div>

      {data.target !== undefined && data.target !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">
            <span className="custom-tooltip__dot" style={{ background: '#10b981' }}></span>
            Target (Meta)
          </span>
          <span className="custom-tooltip__value">{formatValue(data.target, unit)}</span>
        </div>
      )}

      {data.currentAchievement !== undefined && data.currentAchievement !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">Atingimento Meta</span>
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
          <span>Target (Meta)</span>
        </div>
      )}
    </div>
  );
}

export default function ComparisonChart({
  data,
  unit,
  accentColor = '#E7194A',
  lineColor = '#9E9E9E',
  targetColor = '#22C55E',
  selectedPeriod,
  onPeriodClick,
}) {
  const formatYAxis = (val) => {
    if (unit === '%' || unit === 'Ratio') return `${(val * 100).toFixed(1)}%`;
    if (unit === 'MUSD') return `$${val.toFixed(1)}M`;
    return val;
  };

  const hasTarget = data.some(d => d.target !== undefined && d.target !== null);

  const chartData = data.filter(d => d.currentResult !== null || d.previousResult !== null);

  return (
    <div className="comparison-chart-wrapper">
      <div className="comparison-chart-canvas">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
            onClick={(nextState) => {
              if (onPeriodClick && nextState && nextState.activeLabel) {
                onPeriodClick(nextState.activeLabel);
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(189, 189, 189, 0.10)"
            />
            <XAxis
              dataKey="period"
              stroke="#616161"
              tick={{ fill: '#BDBDBD', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#616161"
              tick={{ fill: '#BDBDBD', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip unit={unit} />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            />

            <Bar dataKey="currentResult" radius={[4, 4, 0, 0]} maxBarSize={38}>
              {chartData.map((entry, index) => {
                let fill = accentColor;
                if (entry.isBest) fill = '#22C55E';
                if (entry.isWorst) fill = '#E7194A';

                const isSelected = entry.period === selectedPeriod;
                const opacity = selectedPeriod ? (isSelected ? 1.0 : 0.35) : 0.85;
                const stroke = isSelected ? '#FFFFFF' : 'none';
                const strokeWidth = isSelected ? 2 : 0;

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    fillOpacity={entry.currentResult === null ? 0 : opacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    style={{ cursor: 'pointer' }}
                  />
                );
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