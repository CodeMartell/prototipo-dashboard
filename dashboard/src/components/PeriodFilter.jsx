import React from 'react';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PeriodFilter({
  activePeriod,
  onPeriodChange,
  selectedSubPeriod,
  onSubPeriodChange,
  yearOptions,
  selectedYear,
  onYearChange,
}) {
  const { t } = useTranslation();

  const periods = [
    { key: 'monthly', label: t('filter.monthly') },
    { key: 'quarterly', label: t('filter.quarterly') },
    { key: 'semiannual', label: t('filter.semiannual') },
    { key: 'annual', label: t('filter.annual') },
  ];

  const monthOptions = [
    { key: 'Jan', label: t('filter.Jan') },
    { key: 'Feb', label: t('filter.Feb') },
    { key: 'Mar', label: t('filter.Mar') },
    { key: 'Apr', label: t('filter.Apr') },
    { key: 'May', label: t('filter.May') },
    { key: 'Jun', label: t('filter.Jun') },
    { key: 'Jul', label: t('filter.Jul') },
    { key: 'Aug', label: t('filter.Aug') },
    { key: 'Sep', label: t('filter.Sep') },
    { key: 'Oct', label: t('filter.Oct') },
    { key: 'Nov', label: t('filter.Nov') },
    { key: 'Dec', label: t('filter.Dec') },
  ];

  const quarterOptions = [
    { key: 'Q1', label: t('filter.Q1') },
    { key: 'Q2', label: t('filter.Q2') },
    { key: 'Q3', label: t('filter.Q3') },
    { key: 'Q4', label: t('filter.Q4') },
  ];

  const semesterOptions = [
    { key: 'H1', label: t('filter.H1') },
    { key: 'H2', label: t('filter.H2') },
  ];

  return (
    <div className="period-filter-wrapper">
      {/* Linha superior: pílulas de agrupamento + seletor de ano sempre visível */}
      <div className="period-filter-top-row">
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

        {/* Seletor de ano — sempre visível, independente do tipo de período */}
        <div className="year-selector">
          <CalendarDays size={13} className="year-selector__icon" />
          <label className="year-selector__label" htmlFor="global-year-select">{t('filter.year')}</label>
          <select
            id="global-year-select"
            className="year-select"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year.key} value={year.key}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-seletor de período — só aparece quando NÃO é anual */}
      {activePeriod === 'monthly' && (
        <div className="sub-period-filter">
          <span className="sub-period-filter__label">{t('filter.month_under')}</span>
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
          <span className="sub-period-filter__label">{t('filter.quarter_under')}</span>
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
          <span className="sub-period-filter__label">{t('filter.semester_under')}</span>
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

      {/* Período anual: o seletor de ano no topo já é suficiente — nenhuma fila extra */}
      {activePeriod === 'annual' && (
        <div className="sub-period-filter sub-period-filter--annual-hint">
          <span className="sub-period-filter__label">
            {t('filter.displaying_full')} <strong>{yearOptions.find(y => y.key === selectedYear)?.label ?? selectedYear}</strong>. {t('filter.use_selector')}
          </span>
        </div>
      )}
    </div>
  );
}
