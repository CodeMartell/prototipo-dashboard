import React from 'react';

export default function PeriodFilter({
  activePeriod,
  onPeriodChange,
  selectedSubPeriod,
  onSubPeriodChange,
}) {
  const periods = [
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
    { key: 'semiannual', label: 'Semiannual' },
    { key: 'annual', label: 'Annual' },
  ];

  const monthOptions = [
    { key: 'Jan', label: 'Jan' },
    { key: 'Feb', label: 'Feb' },
    { key: 'Mar', label: 'Mar' },
    { key: 'Apr', label: 'Apr' },
    { key: 'May', label: 'May' },
    { key: 'Jun', label: 'Jun' },
    { key: 'Jul', label: 'Jul' },
    { key: 'Aug', label: 'Aug' },
    { key: 'Sep', label: 'Sep' },
    { key: 'Oct', label: 'Oct' },
    { key: 'Nov', label: 'Nov' },
    { key: 'Dec', label: 'Dec' },
  ];

  const quarterOptions = [
    { key: 'Q1', label: '1st Qtr (Q1)' },
    { key: 'Q2', label: '2nd Qtr (Q2)' },
    { key: 'Q3', label: '3rd Qtr (Q3)' },
    { key: 'Q4', label: '4th Qtr (Q4)' },
  ];

  const semesterOptions = [
    { key: 'H1', label: '1st Sem (H1)' },
    { key: 'H2', label: '2nd Sem (H2)' },
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
          <span className="sub-period-filter__label">Month under Verification:</span>
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
          <span className="sub-period-filter__label">Quarter under Verification:</span>
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
          <span className="sub-period-filter__label">Semester under Verification:</span>
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