import { Trophy, AlertTriangle, Table as TableIcon } from 'lucide-react';
import { formatPercent, formatCurrency, formatMetricValue } from '../utils/formatters';

const formatCell = (value, format, unit) => {
  if (value === null || value === undefined) return '—';
  if (format === 'metric') return formatMetricValue(value, unit);
  if (format === 'percent') return formatPercent(value);
  if (format === 'currency') return formatCurrency(value);
  if (format === 'achievement') return `${(value * 100).toFixed(0)}%`;
  return value;
};

export default function DetailTable({
  data,
  columns,
  _lowerIsBetter,
  bestPeriod,
  worstPeriod,
  anomalies = [],
  selectedPeriod,
  onPeriodClick,
}) {
  const hasData = data.some(
    (row) =>
      (row.currentResult !== null && row.currentResult !== undefined) ||
      (row.previousResult !== null && row.previousResult !== undefined)
  );

  if (!hasData) {
    return (
      <div className="chart-empty-state" role="status">
        <TableIcon size={28} aria-hidden="true" />
        <strong>No data at the moment</strong>
        <span>There is no record for this indicator in the selected period.</span>
      </div>
    );
  }

  return (
    <div className="data-table__container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const isBest = row.period === bestPeriod;
            const isWorst = row.period === worstPeriod;
            const isAnomaly = anomalies.includes(row.period);
            const isSelected = row.period === selectedPeriod;

            let rowClasses = [];
            if (isBest) rowClasses.push('row-best');
            else if (isWorst) rowClasses.push('row-worst');
            else if (isAnomaly) rowClasses.push('row-anomaly');
            if (isSelected) rowClasses.push('row-selected');

            const rowClass = rowClasses.join(' ');

            return (
              <tr
                key={row.period || rowIndex}
                className={rowClass}
                onClick={() => onPeriodClick && onPeriodClick(row.period)}
                style={{ cursor: onPeriodClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, colIndex) => {
                  const value = row[col.key];
                  const formatted = formatCell(value, col.format, col.unit);

                  // First column: period name with icons
                  if (colIndex === 0) {
                    return (
                      <td key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isBest && <Trophy size={14} style={{ color: '#fbbf24' }} />}
                        {isWorst && <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                        {isAnomaly && !isBest && !isWorst && (
                          <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                        )}
                        <span style={isBest ? { color: '#fbbf24', fontWeight: 600 } : isWorst ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                          {formatted}
                        </span>
                      </td>
                    );
                  }

                  // Highlighted columns (achievement, result)
                  let cellStyle = {};
                  if (col.highlight && value !== null && value !== undefined) {
                    if (col.format === 'achievement') {
                      if (value >= 1.0) cellStyle = { color: 'var(--success)', fontWeight: 600 };
                      else if (value >= 0.9) cellStyle = { color: 'var(--warning)', fontWeight: 600 };
                      else cellStyle = { color: 'var(--danger)', fontWeight: 600 };
                    }
                  }

                  return (
                    <td key={col.key} style={cellStyle}>
                      {formatted}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
