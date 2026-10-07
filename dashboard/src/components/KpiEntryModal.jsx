import { useEffect, useMemo, useState } from 'react';
import { X, Save, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { MONTHS } from '../utils/kpiData';
import { saveKpiRecord, saveLogisticsVsProd, deleteKpiRecord } from '../services/api';
import { canDeleteKpiData } from '../services/permissions';
import { useTranslation } from 'react-i18next';

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

const getUnitHint = (unit, t) => {
  const map = {
    '%': t('kpi_modal.hint_pct'),
    KUSD: t('kpi_modal.hint_kusd'),
    KBRL: t('kpi_modal.hint_kbrl'),
    MUSD: t('kpi_modal.hint_musd'),
    CTNR: t('kpi_modal.hint_ctnr'),
  };
  return map[unit];
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
  currentUser,
  onSaved,
}) {
  const { t } = useTranslation();
  const isRatioKpi = kpi?.valueKey === 'ratio';

  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [fields, setFields] = useState({ target: '', result: '', logisticsCost: '', productionAmount: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
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
    setDeleteConfirm(false);
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
        setError(t('kpi_modal.err_fill_both'));
        return;
      }
      if (value < 0) {
        setError(t('kpi_modal.err_negative'));
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
      setError(err.message || t('kpi_modal.err_save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteKpiRecord(kpi.dataKey, { year, month });
      await onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || t('kpi_modal.err_delete'));
      setDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hint = getUnitHint(kpi.unit, t) || '';

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
            <h2 id="kpi-entry-title">{t('kpi_modal.title_manual').replace('{name}', kpi.name)}</h2>
            <p className="kpi-entry-modal__subtitle">
              {existingRecord ? t('kpi_modal.subtitle_update') : t('kpi_modal.subtitle_create')}{t('kpi_modal.subtitle_suffix')}
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="kpi-entry-form" onSubmit={handleSubmit}>
          <div className="kpi-entry-form__row">
            <label className="kpi-entry-field">
              <span>{t('kpi_modal.lbl_year')}</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    20{String(option).replace(/\D/g, '')}
                  </option>
                ))}
              </select>
            </label>

            <label className="kpi-entry-field">
              <span>{t('kpi_modal.lbl_month')}</span>
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
                <span>{t('kpi_modal.lbl_log_cost')}</span>
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
                <span>{t('kpi_modal.lbl_prod_amt')}</span>
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
                <span>{t('kpi_modal.lbl_target')} {hint && <small>{hint}</small>}</span>
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
                <span>{t('kpi_modal.lbl_result')} {hint && <small>{hint}</small>}</span>
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
              ? t('kpi_modal.note_ratio')
              : t('kpi_modal.note_target')}
          </p>

          {error && (
            <div className="kpi-entry-form__error" role="alert">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="kpi-entry-form__actions">
            {/* Delete zone — only shown for an existing record if user has permission to delete it */}
            {existingRecord && canDeleteKpiData(currentUser, existingRecord) && (
              <div className="kpi-entry-form__delete-zone">
                {deleteConfirm ? (
                  <>
                    <span className="kpi-entry-form__delete-warning">
                      <AlertTriangle size={13} /> {t('kpi_modal.del_warning')}
                    </span>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      {isDeleting ? t('kpi_modal.btn_deleting') : t('kpi_modal.btn_confirm_del')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      {t('kpi_modal.btn_cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn--danger-outline"
                    onClick={() => setDeleteConfirm(true)}
                    disabled={isSaving}
                  >
                    <Trash2 size={14} />
                    {t('kpi_modal.btn_del_entry')}
                  </button>
                )}
              </div>
            )}


            <div className="kpi-entry-form__save-zone">
              <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSaving || isDeleting}>
                {t('kpi_modal.btn_cancel')}
              </button>
              <button type="submit" className="btn btn--primary" disabled={isSaving || isDeleting}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? t('kpi_modal.btn_saving') : t('kpi_modal.btn_save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
