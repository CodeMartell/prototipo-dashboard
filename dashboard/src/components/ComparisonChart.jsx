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
import { BarChart3 } from 'lucide-react';
import { formatPercent, formatCurrency } from '../utils/formatters';
import { calculateVariation } from '../data/mockData';

const formatValue = (val, unit) => {
  if (val === undefined || val === null) return '—';
  if (unit === '%' || unit === 'Ratio') return formatPercent(val);
  if (unit === 'MUSD') return formatCurrency(val);
  return val;
};

function CustomTooltip({ active, payload, label, unit, currentYearLabel = '2026', prevYearLabel = '2025' }) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;

  const variation = calculateVariation(data.currentResult, data.previousResult);

  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip__title">{label}</div>
      
      <div className="custom-tooltip__row">
        <span className="custom-tooltip__label">
          <span className="custom-tooltip__dot" style={{ background: '#3B82F6' }}></span>
          Actual ({currentYearLabel})
        </span>
        <span className="custom-tooltip__value">{formatValue(data.currentResult, unit)}</span>
      </div>
      
      <div className="custom-tooltip__row">
        <span className="custom-tooltip__label">
          <span className="custom-tooltip__dot" style={{ background: '#A78BFA' }}></span>
          Previous ({prevYearLabel})
        </span>
        <span className="custom-tooltip__value">{formatValue(data.previousResult, unit)}</span>
      </div>

      {data.target !== undefined && data.target !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">
            <span className="custom-tooltip__dot" style={{ background: '#F59E0B' }}></span>
            Target
          </span>
          <span className="custom-tooltip__value">{formatValue(data.target, unit)}</span>
        </div>
      )}

      {data.currentAchievement !== undefined && data.currentAchievement !== null && (
        <div className="custom-tooltip__row">
          <span className="custom-tooltip__label">Target Achievement</span>
          <span className="custom-tooltip__value">{(data.currentAchievement * 100).toFixed(0)}%</span>
        </div>
      )}

      {variation !== null && (
        <div className="custom-tooltip__variation" style={{ color: variation > 0 ? 'var(--danger)' : 'var(--success)' }}>
          YoY Variation: {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function CustomLegend({ accentColor, lineColor, targetColor, hasTarget, currentYearLabel = '2026', prevYearLabel = '2025' }) {
  return (
    <div className="custom-legend">
      <div className="custom-legend__item">
        <div className="custom-legend__marker--bar" style={{ background: accentColor }}></div>
        <span>{currentYearLabel} (Actual)</span>
      </div>
      <div className="custom-legend__item">
        <div className="custom-legend__marker" style={{ background: lineColor }}></div>
        <span>{prevYearLabel} (Previous Year)</span>
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

/* Paleta: barras sempre em tons de azul; linhas de target e ano anterior em cores não-vermelhas. */
const BAR_BEST = '#7DD3FC';   // azul claro — melhor período
const BAR_WORST = '#1E3A8A';  // azul escuro — pior período

export default function ComparisonChart({
  data,
  unit,
  accentColor = '#3B82F6',
  lineColor = '#A78BFA',
  targetColor = '#F59E0B',
  selectedPeriod,
  onPeriodClick,
  currentYearLabel = '2026',
  prevYearLabel = '2025',
}) {
  const formatYAxis = (val) => {
    if (unit === '%' || unit === 'Ratio') return `${(val * 100).toFixed(1)}%`;
    if (unit === 'MUSD') return `$${val.toFixed(1)}M`;
    return val;
  };

  const hasTarget = data.some(d => d.target !== undefined && d.target !== null);

  const chartData = data.filter(d => d.currentResult !== null || d.previousResult !== null);

  // Sem nenhum ponto valido nao ha grafico para desenhar: mostra o estado vazio
  // em vez de eixos vazios, que passam a impressao de valor zero.
  if (chartData.length === 0) {
    return (
      <div className="comparison-chart-wrapper">
        <div className="chart-empty-state" role="status">
          <BarChart3 size={28} aria-hidden="true" />
          <strong>No data at the moment</strong>
          <span>There is no record for this indicator in the selected period.</span>
        </div>
      </div>
    );
  }

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
              stroke="var(--border)"
            />
            <XAxis
              dataKey="period"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatYAxis}
              width={55}
            />
            <Tooltip
              content={
                <CustomTooltip 
                  unit={unit} 
                  currentYearLabel={currentYearLabel}
                  prevYearLabel={prevYearLabel}
                />
              }
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
            />

            <Bar dataKey="currentResult" radius={[4, 4, 0, 0]} maxBarSize={38}>
              {chartData.map((entry, index) => {
                let fill = accentColor;
                if (entry.isBest) fill = BAR_BEST;
                if (entry.isWorst) fill = BAR_WORST;

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
        currentYearLabel={currentYearLabel}
        prevYearLabel={prevYearLabel}
      />
    </div>
  );
}