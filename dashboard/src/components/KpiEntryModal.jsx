import { useEffect, useMemo, useState } from 'react';
import { X, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { MONTHS } from '../utils/kpiData';
import { saveKpiRecord, saveLogisticsVsProd } from '../services/api';

/**
 * Lançamento manual dos valores de um indicador num mês.
 *
 * Indicadores padrão recebem meta e resultado; Logistics Cost x Prod Amount
 * recebe custo logístico e volume produzido. Atingimento e ratio são
 * calculados pelo backend, então não são digitados aqui.
 *
 * Indicadores em "%" são digitados em pontos percentuais (4,7 = 4,7%) e
 * convertidos para fração antes de ir para a API, que é como o banco guarda.
 */

const isPercentUnit = (unit) => unit === '%';

const UNIT_HINT = {
  '%': 'em % (ex.: 4,7 para 4,7%)',
  KUSD: 'em milhares de USD',
  KBRL: 'em milhares de BRL',
  MUSD: 'em milhões de USD',
  CTNR: 'em quantidade de contêineres',
};

/** Aceita vírgula como separador decimal, como o usuário digita em pt-BR. */
function parseNumber(raw) {
  if (typeof raw !== 'string') return Number.isFinite(raw) ? raw : null;
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInputValue(value, unit) {
  if (value === null || value === undefined) return '';
  const scaled = isPercentUnit(unit) ? value * 100 : value;
  return String(Number(scaled.toFixed(6)));
}

export default function KpiEntryModal({
  isOpen,
  onClose,
  kpi,
  years = [],
  defaultYear,
  defaultMonth,
  onSaved,
}) {
  const isRatioKpi = kpi?.valueKey === 'ratio';

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [fields, setFields] = useState({ target: '', result: '', logisticsCost: '', productionAmount: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const yearOptions = useMemo(() => {
    const merged = new Set([...years, defaultYear].filter(Boolean));
    return Array.from(merged).sort((a, b) => {
      const numA = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [years, defaultYear]);

  // Registro já existente do período escolhido: o formulário abre preenchido
  // para o usuário corrigir em vez de digitar tudo de novo.
  const existingRecord = useMemo(() => {
    if (!kpi?.monthly) return null;
    return kpi.monthly.find((row) => row.year === year && row.month === month) || null;
  }, [kpi, year, month]);

  useEffect(() => {
    if (!isOpen) return;
    setYear(defaultYear);
    setMonth(MONTHS.includes(defaultMonth) ? defaultMonth : MONTHS[0]);
    setError(null);
  }, [isOpen, defaultYear, defaultMonth]);

  useEffect(() => {
    if (!isOpen) return;
    setFields({
      target: toInputValue(existingRecord?.target, kpi?.unit),
      result: toInputValue(existingRecord?.result, kpi?.unit),
      logisticsCost: toInputValue(existingRecord?.logisticsCost, 'MUSD'),
      productionAmount: toInputValue(existingRecord?.productionAmount, 'MUSD'),
    });
  }, [isOpen, existingRecord, kpi?.unit]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !kpi) return null;

  const setField = (name, value) => setFields((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const required = isRatioKpi ? ['logisticsCost', 'productionAmount'] : ['target', 'result'];
    const parsed = {};
    for (const name of required) {
      const value = parseNumber(fields[name]);
      if (value === null) {
        setError('Preencha os dois campos com números válidos.');
        return;
      }
      if (value < 0) {
        setError('Valores negativos não são aceitos.');
        return;
      }
      parsed[name] = value;
    }

    setIsSaving(true);
    try {
      if (isRatioKpi) {
        await saveLogisticsVsProd({
          year,
          month,
          logisticsCost: parsed.logisticsCost,
          productionAmount: parsed.productionAmount,
        });
      } else {
        const factor = isPercentUnit(kpi.unit) ? 0.01 : 1;
        await saveKpiRecord(kpi.dataKey, {
          year,
          month,
          target: parsed.target * factor,
          result: parsed.result * factor,
        });
      }
      await onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const hint = UNIT_HINT[kpi.unit] || '';

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content kpi-entry-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-entry-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="kpi-entry-title">Manual entry — {kpi.name}</h2>
            <p className="kpi-entry-modal__subtitle">
              {existingRecord ? 'Updating an existing record' : 'Creating a new record'} for the selected period.
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="kpi-entry-form" onSubmit={handleSubmit}>
          <div className="kpi-entry-form__row">
            <label className="kpi-entry-field">
              <span>Year</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    20{String(option).replace(/\D/g, '')}
                  </option>
                ))}
              </select>
            </label>

            <label className="kpi-entry-field">
              <span>Month</span>
              <select value={month} onChange={(event) => setMonth(event.target.value)}>
                {MONTHS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isRatioKpi ? (
            <div className="kpi-entry-form__row">
              <label className="kpi-entry-field">
                <span>Logistics cost (MUSD)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields.logisticsCost}
                  onChange={(event) => setField('logisticsCost', event.target.value)}
                  placeholder="2,64"
                  autoFocus
                />
              </label>
              <label className="kpi-entry-field">
                <span>Production amount (MUSD)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields.productionAmount}
                  onChange={(event) => setField('productionAmount', event.target.value)}
                  placeholder="49,27"
                />
              </label>
            </div>
          ) : (
            <div className="kpi-entry-form__row">
              <label className="kpi-entry-field">
                <span>Target {hint && <small>{hint}</small>}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields.target}
                  onChange={(event) => setField('target', event.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </label>
              <label className="kpi-entry-field">
                <span>Result {hint && <small>{hint}</small>}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields.result}
                  onChange={(event) => setField('result', event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
          )}

          <p className="kpi-entry-form__note">
            {isRatioKpi
              ? 'The ratio is calculated by the backend from cost and production.'
              : 'Target achievement is calculated by the backend based on the indicator direction.'}
          </p>

          {error && (
            <div className="kpi-entry-form__error" role="alert">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="kpi-entry-form__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save values'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
