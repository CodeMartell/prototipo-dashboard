import React from 'react';

export default function PeriodFilter({ activePeriod, onChange }) {
  const periods = [
    { key: 'monthly', label: 'Mensal' },
    { key: 'quarterly', label: 'Trimestral' },
    { key: 'semiannual', label: 'Semestral' },
    { key: 'annual', label: 'Anual' },
  ];

  return (
    <div className="period-filter">
      {periods.map(p => (
        <button
          key={p.key}
          className={`filter-pill ${activePeriod === p.key ? 'active' : ''}`}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}