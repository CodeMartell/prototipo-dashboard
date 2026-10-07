import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { buildConsolidatedRows, downloadConsolidatedCsv } from '../utils/exportCsv.js';
import { buildIndicatorReport, downloadIndicatorReport, resolveReportScope } from '../utils/exportReport.js';
import { useTranslation } from 'react-i18next';
import './ExportModal.css';

const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS_LIST = ['Q1', 'Q2', 'Q3', 'Q4'];
const SEMESTERS_LIST = ['H1', 'H2'];

// Rule 3.3.1 generalized: each indicator aggregates by sum or average,
// following its own official documentation — never the same for all.
const AGGREGATED_SCOPE_HINT = {
  quarterly: "One column for the selected quarter, using each indicator's sum, average or weighted ratio.",
  semiannual: "One column for the selected half-year, using each indicator's sum, average or weighted ratio.",
  annual: "One consolidated column per year, using each indicator's sum, average or weighted ratio.",
};

export default function ExportModal({
  isOpen,
  onClose,
  kpiCatalog = [],
  datasets = {},
  selectedYear = 'Y26',
  availableYears = ['Y24', 'Y25', 'Y26'],
  period = 'monthly',
  selectedSubPeriod = 'Jan',
}) {
  const { t } = useTranslation();
  const [selectedKpiKeys, setSelectedKpiKeys] = useState([]);
  const [exportYears, setExportYears] = useState([selectedYear]);
  const [exportScope, setExportScope] = useState('all_months');
  const [specificMonth, setSpecificMonth] = useState(selectedSubPeriod || 'Jan');
  const [specificQuarter, setSpecificQuarter] = useState('Q1');
  const [specificSemester, setSpecificSemester] = useState('H1');
  const [yearsDropdownOpen, setYearsDropdownOpen] = useState(false);
  const yearsDropdownRef = useRef(null);
  const [delimiter, setDelimiter] = useState(';');
  const [fileFormat, setFileFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Reset selection to all indicators whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedKpiKeys(kpiCatalog.map((k) => k.key));
      setExportYears([selectedYear]);
      setSpecificMonth(selectedSubPeriod && MONTHS_LIST.includes(selectedSubPeriod) ? selectedSubPeriod : 'Jan');
      setExportSuccess(false);
      setExportError('');
      setYearsDropdownOpen(false);
    }
  }, [isOpen, kpiCatalog, selectedYear, selectedSubPeriod]);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !exporting) {
        if (yearsDropdownOpen) {
          setYearsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, yearsDropdownOpen, exporting]);

  // Close the years dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearsDropdownRef.current && !yearsDropdownRef.current.contains(e.target)) {
        setYearsDropdownOpen(false);
      }
    };
    if (yearsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [yearsDropdownOpen]);

  // List of selected KPIs (full objects)
  const selectedKpiObjects = useMemo(
    () => kpiCatalog.filter((k) => selectedKpiKeys.includes(k.key)),
    [kpiCatalog, selectedKpiKeys]
  );

  const exportOptions = useMemo(() => ({
    selectedKpis: selectedKpiObjects, datasets, years: exportYears,
    scope: exportScope, period, selectedSubPeriod, specificMonth, specificQuarter, specificSemester,
  }), [selectedKpiObjects, datasets, exportYears, exportScope, period, selectedSubPeriod, specificMonth, specificQuarter, specificSemester]);
  const report = useMemo(() => buildIndicatorReport(exportOptions), [exportOptions]);
  const previewRows = useMemo(() => buildConsolidatedRows(resolveReportScope(exportOptions)), [exportOptions]);
  const hasData = fileFormat === 'xlsx' ? report.sectionCount > 0 : previewRows.length > 0;

  if (!isOpen) return null;

  const isAllSelected = selectedKpiKeys.length === kpiCatalog.length;
  const isAllYearsSelected = exportYears.length === availableYears.length;

  const yearsSummaryLabel = isAllYearsSelected
    ? t('export.all_years')
    : exportYears.length === 0
    ? t('export.no_year')
    : exportYears
        .slice()
        .sort()
        .map((yr) => (yr.startsWith('Y') ? `20${yr.substring(1)}` : yr))
        .join(', ');

  const handleSelectAll = () => {
    setSelectedKpiKeys(kpiCatalog.map((k) => k.key));
  };

  const handleClearAll = () => {
    setSelectedKpiKeys([]);
  };

  const handleToggleKpi = (key) => {
    setSelectedKpiKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleYear = (year) => {
    setExportYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleSelectAllYears = () => {
    setExportYears([...availableYears]);
  };

  const handleClearAllYears = () => {
    setExportYears([]);
  };

  const handleExport = async () => {
    if (!hasData || exporting) return;
    setExporting(true);
    setExportError('');
    const effective = resolveReportScope(exportOptions);
    const detail = effective.scope === 'specific_month' ? effective.specificMonth
      : effective.scope === 'quarterly' ? effective.specificQuarter
      : effective.scope === 'semiannual' ? effective.specificSemester : '';
    const filename = `export_report_${exportYears.slice().sort().join('-')}_${effective.scope}${detail ? `_${detail}` : ''}.${fileFormat}`;
    try {
      if (fileFormat === 'xlsx') await downloadIndicatorReport(report, filename);
      else downloadConsolidatedCsv({ rows: previewRows, delimiter, filename });
      setExportSuccess(true);
    } catch (error) {
      setExportError(error.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={exporting ? undefined : onClose} role="dialog" aria-modal="true">
      <div className="modal-content export-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={22} className="modal-title-icon" />
            <div>
              <h3>{t('export.title')}</h3>
              <p>{t('export.desc')}</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} disabled={exporting} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <fieldset className="export-modal__body" disabled={exporting} style={{ border: 0, margin: 0, minWidth: 0 }}>
          {/* Section 1: KPI Selection */}
          <div className="export-section">
            <div className="export-section__header">
              <div className="export-section__title">
                <Layers size={16} />
                {t('export.indicators_title')}
                <span className="export-section__badge">
                  {selectedKpiKeys.length} of {kpiCatalog.length} {t('export.selected')}
                </span>
              </div>
              <div className="export-section__actions">
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleSelectAll}
                  disabled={isAllSelected}
                >
                  {t('export.select_all')}
                </button>
                <span style={{ color: 'var(--border)' }}>•</span>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleClearAll}
                  disabled={selectedKpiKeys.length === 0}
                >
                  {t('export.clear_all')}
                </button>
              </div>
            </div>

            <div className="export-kpi-grid">
              {kpiCatalog.map((kpi) => {
                const isSelected = selectedKpiKeys.includes(kpi.key);
                const Icon = kpi.icon || FileSpreadsheet;
                return (
                  <div
                    key={kpi.key}
                    className={`export-kpi-card ${isSelected ? 'export-kpi-card--selected' : ''}`}
                    onClick={() => handleToggleKpi(kpi.key)}
                  >
                    <div className="export-kpi-card__left">
                      <input
                        type="checkbox"
                        className="export-kpi-card__checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Select ${kpi.name}`}
                      />
                      <div className="export-kpi-card__icon" style={{ color: kpi.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="export-kpi-card__info">
                        <span className="export-kpi-card__name">{t(`nav.${kpi.key}`)}</span>
                        <span className="export-kpi-card__unit">{t('export.unit')} {kpi.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Period & Scope */}
          <div className="export-section">
            <div className="export-section__header">
              <div className="export-section__title">
                <Calendar size={16} />
                {t('export.time_scope')}
              </div>
            </div>

            <div className="export-options-row">
              {/* Year Dropdown (closed, opens a checkbox list) */}
              <div className="export-field-group" style={{ flex: 1 }} ref={yearsDropdownRef}>
                <label className="export-label">{t('export.years')}</label>
                <div className="export-year-dropdown">
                  <button
                    type="button"
                    className="export-select export-year-dropdown__trigger"
                    onClick={() => setYearsDropdownOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={yearsDropdownOpen}
                  >
                    <span>{yearsSummaryLabel}</span>
                    <ChevronDown size={16} className={yearsDropdownOpen ? 'export-year-dropdown__chevron export-year-dropdown__chevron--open' : 'export-year-dropdown__chevron'} />
                  </button>

                  {yearsDropdownOpen && (
                    <div className="export-year-dropdown__panel" role="listbox">
                      <div className="export-year-dropdown__actions">
                        <button
                          type="button"
                          className="btn-link-action"
                          onClick={handleSelectAllYears}
                          disabled={isAllYearsSelected}
                        >
                          {t('export.select_all')}
                        </button>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <button
                          type="button"
                          className="btn-link-action"
                          onClick={handleClearAllYears}
                          disabled={exportYears.length === 0}
                        >
                          {t('export.clear_all')}
                        </button>
                      </div>
                      {availableYears.map((yr) => {
                        const isChecked = exportYears.includes(yr);
                        const label = yr.startsWith('Y') ? `20${yr.substring(1)} (${yr})` : yr;
                        return (
                          <label key={yr} className="export-year-dropdown__item">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleYear(yr)}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="export-field-group">
                <label className="export-label" htmlFor="export-file-format">{t('export.file_format')}</label>
                <select id="export-file-format" className="export-select" value={fileFormat} onChange={(e) => { setFileFormat(e.target.value); setExportSuccess(false); }}>
                  <option value="xlsx">{t('export.format_xlsx')}</option>
                  <option value="csv">{t('export.format_csv')}</option>
                </select>
                {fileFormat === 'csv' && <>
                  <label className="export-label" htmlFor="export-delimiter">{t('export.csv_delimiter')}</label>
                  <select id="export-delimiter" className="export-select" value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                    <option value=";">Semicolon ( ; )</option>
                    <option value=",">Comma ( , )</option>
                  </select>
                </>}
              </div>
            </div>

            {/* Scope Pills */}
            <div className="export-field-group" style={{ marginTop: '0.5rem' }}>
              <label className="export-label">{t('export.granularity')}</label>
              <div className="export-scope-pills">
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'all_months' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('all_months')}
                >
                  {t('export.scope_all')}
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'current_period' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('current_period')}
                >
                  {t('export.scope_current')} ({selectedSubPeriod})
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'specific_month' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('specific_month')}
                >
                  {t('export.scope_month')}
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'quarterly' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('quarterly')}
                >
                  {t('export.scope_quarter')}
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'semiannual' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('semiannual')}
                >
                  {t('export.scope_semester')}
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'annual' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('annual')}
                >
                  {t('export.scope_annual')}
                </button>
              </div>

              {exportScope === 'specific_month' && (
                <div style={{ marginTop: '0.5rem', maxWidth: '200px' }}>
                  <select
                    className="export-select"
                    value={specificMonth}
                    onChange={(e) => setSpecificMonth(e.target.value)}
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportScope === 'quarterly' && (
                <div style={{ marginTop: '0.5rem', maxWidth: '200px' }}>
                  <select
                    className="export-select"
                    value={specificQuarter}
                    onChange={(e) => setSpecificQuarter(e.target.value)}
                  >
                    {QUARTERS_LIST.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportScope === 'semiannual' && (
                <div style={{ marginTop: '0.5rem', maxWidth: '200px' }}>
                  <select
                    className="export-select"
                    value={specificSemester}
                    onChange={(e) => setSpecificSemester(e.target.value)}
                  >
                    {SEMESTERS_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s === 'H1' ? 'H1 (1st Half)' : 'H2 (2nd Half)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exportScope === 'quarterly' && <p className="export-scope-hint">{t('export.hint_quarter')}</p>}
              {exportScope === 'semiannual' && <p className="export-scope-hint">{t('export.hint_semester')}</p>}
              {exportScope === 'annual' && <p className="export-scope-hint">{t('export.hint_annual')}</p>}
            </div>
          </div>

          {/* Section 3: Summary / Preview */}
          <div className="export-section">
            {selectedKpiKeys.length === 0 ? (
              <div className="export-summary-banner export-summary-banner--warning">
                <AlertTriangle size={18} />
                <span className="export-summary-banner__text">
                  {t('export.warn_no_kpi')}
                </span>
              </div>
            ) : exportYears.length === 0 ? (
              <div className="export-summary-banner export-summary-banner--warning">
                <AlertTriangle size={18} />
                <span className="export-summary-banner__text">
                  {t('export.warn_no_year')}
                </span>
              </div>
            ) : exportSuccess ? (
              <div className="export-summary-banner" style={{ borderColor: 'var(--success, #22c55e)', color: 'var(--success, #22c55e)' }}>
                <CheckCircle2 size={18} />
                <span className="export-summary-banner__text" style={{ color: 'var(--success, #22c55e)' }}>
                  {t('export.success')}
                </span>
              </div>
            ) : (
              <div className="export-summary-banner">
                <FileSpreadsheet size={18} style={{ color: 'var(--brand-500)' }} />
                <span className="export-summary-banner__text">
                  {fileFormat === 'xlsx'
                    ? <>{t('export.summary_xlsx').replace('{count}', report.sectionCount)}</>
                    : <>{t('export.summary_csv').replace('{count}', previewRows.length)}</>}
                  {!hasData && <strong> {t('export.no_data')}</strong>}
                </span>
              </div>
            )}
          </div>
        </fieldset>

        {exportError && <p role="alert" className="export-summary-banner export-summary-banner--warning">{exportError}</p>}
        {/* Footer Actions */}
        <div className="export-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={exporting}>
            {t('export.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExport}
            disabled={!hasData || exporting}
          >
            <Download size={16} />
            {exporting
              ? t('export.generating') : exportSuccess ? t('export.download_again')
              : `${t('export.export_btn')} (${selectedKpiKeys.length} ${t('export.indicators_title')})`}
          </button>
        </div>
      </div>
    </div>
  );
}
