import React from 'react';

export default function PeriodFilter({
  activePeriod,
  onPeriodChange,
  selectedSubPeriod,
  onSubPeriodChange,
}) {
  const periods = [
    { key: 'monthly', label: 'Mensal' },
    { key: 'quarterly', label: 'Trimestral' },
    { key: 'semiannual', label: 'Semestral' },
    { key: 'annual', label: 'Anual' },
  ];

  const monthOptions = [
    { key: 'Jan', label: 'Jan' },
    { key: 'Feb', label: 'Fev' },
    { key: 'Mar', label: 'Mar' },
    { key: 'Apr', label: 'Abr' },
    { key: 'May', label: 'Mai' },
    { key: 'Jun', label: 'Jun' },
    { key: 'Jul', label: 'Jul' },
    { key: 'Aug', label: 'Ago' },
    { key: 'Sep', label: 'Set' },
    { key: 'Oct', label: 'Out' },
    { key: 'Nov', label: 'Nov' },
    { key: 'Dec', label: 'Dez' },
  ];

  const quarterOptions = [
    { key: 'Q1', label: '1º Trim (Q1)' },
    { key: 'Q2', label: '2º Trim (Q2)' },
    { key: 'Q3', label: '3º Trim (Q3)' },
    { key: 'Q4', label: '4º Trim (Q4)' },
  ];

  const semesterOptions = [
    { key: 'H1', label: '1º Sem (H1)' },
    { key: 'H2', label: '2º Sem (H2)' },
  ];

  return (
    <div className="period-filter-wrapper">
      {/* High-level Grouping Selector */}
      <div className="period-filter">
        {periods.map((p) => (
          <button
            key={p.key}
            className={`filter-pill ${activePeriod === p.key ? 'active' : ''}`}
            onClick={() => onPeriodChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Specific Sub-Period Selector */}
      {activePeriod === 'monthly' && (
        <div className="sub-period-filter">
          <span className="sub-period-filter__label">Mês em Verificação:</span>
          <div className="sub-period-pills-scroll">
            {monthOptions.map((m) => (
              <button
                key={m.key}
                className={`sub-filter-pill ${selectedSubPeriod === m.key ? 'active' : ''}`}
                onClick={() => onSubPeriodChange(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePeriod === 'quarterly' && (
        <div className="sub-period-filter">
          <span className="sub-period-filter__label">Trimestre em Verificação:</span>
          <div className="sub-period-pills-scroll">
            {quarterOptions.map((q) => (
              <button
                key={q.key}
                className={`sub-filter-pill ${selectedSubPeriod === q.key ? 'active' : ''}`}
                onClick={() => onSubPeriodChange(q.key)}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePeriod === 'semiannual' && (
        <div className="sub-period-filter">
          <span className="sub-period-filter__label">Semestre em Verificação:</span>
          <div className="sub-period-pills-scroll">
            {semesterOptions.map((s) => (
              <button
                key={s.key}
                className={`sub-filter-pill ${selectedSubPeriod === s.key ? 'active' : ''}`}
                onClick={() => onSubPeriodChange(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}