/**
 * src/components/DateRangeFilter.jsx
 * Filtro de período com atalhos estilo airplane-ticket.
 * Usado em AuditPage e em qualquer tela que precise filtrar por intervalo de datas.
 */
import { useState, useCallback } from 'react';

const SHORTCUTS = [
  { label: 'Hoje', get: () => [startOfDay(new Date()), new Date()] },
  { label: 'Últimos 7d', get: () => [daysAgo(7), new Date()] },
  { label: 'Este mês', get: () => [startOfMonth(new Date()), new Date()] },
  { label: 'Últimos 90d', get: () => [daysAgo(90), new Date()] },
];

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(n) {
  return startOfDay(new Date(Date.now() - n * 86400000));
}

function toInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * @param {object} props
 * @param {Date|null} props.dateFrom
 * @param {Date|null} props.dateTo
 * @param {(from: Date|null, to: Date|null) => void} props.onChange
 * @param {boolean} [props.loading]
 * @param {string} [props.className]
 */
export default function DateRangeFilter({ dateFrom, dateTo, onChange, loading = false, className = '' }) {
  const [activeShortcut, setActiveShortcut] = useState(null);

  const handleShortcut = useCallback((shortcut, idx) => {
    const [from, to] = shortcut.get();
    setActiveShortcut(idx);
    onChange(from, to);
  }, [onChange]);

  const handleFromChange = (e) => {
    setActiveShortcut(null);
    onChange(e.target.value ? new Date(e.target.value) : null, dateTo);
  };

  const handleToChange = (e) => {
    setActiveShortcut(null);
    onChange(dateFrom, e.target.value ? new Date(e.target.value) : null);
  };

  return (
    <div className={`drf-container ${className}`}>
      {/* Atalhos */}
      <div className="drf-shortcuts">
        {SHORTCUTS.map((s, idx) => (
          <button
            key={s.label}
            type="button"
            onClick={() => handleShortcut(s, idx)}
            disabled={loading}
            className={`drf-btn-shortcut ${activeShortcut === idx ? 'active' : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className="drf-separator">ou</span>

      {/* Intervalo manual — estilo airplane ticket */}
      <div className="drf-ticket-box">
        <div className="drf-ticket-cell">
          <label className="drf-ticket-label">De</label>
          <input
            type="date"
            value={toInputValue(dateFrom)}
            onChange={handleFromChange}
            disabled={loading}
            className="drf-ticket-input"
          />
        </div>
        <div className="drf-ticket-cell">
          <label className="drf-ticket-label">Até</label>
          <input
            type="date"
            value={toInputValue(dateTo)}
            onChange={handleToChange}
            disabled={loading}
            min={toInputValue(dateFrom) || undefined}
            className="drf-ticket-input"
          />
        </div>
      </div>
    </div>
  );
}
