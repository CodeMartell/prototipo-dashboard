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
import './ExportModal.css';

const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS_LIST = ['Q1', 'Q2', 'Q3', 'Q4'];
const SEMESTERS_LIST = ['H1', 'H2'];

// Rule 3.3.1 generalized: each indicator aggregates by sum or average,
// following its own official documentation — never the same for all.
const AGGREGATED_SCOPE_HINT = {
  quarterly: "One row per indicator with the quarter already summed/averaged, following each indicator's own rule.",
  semiannual: "One row per indicator with the half-year already summed/averaged, following each indicator's own rule.",
  annual: "One row per indicator with the full year already summed/averaged, following each indicator's own rule.",
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
  const [selectedKpiKeys, setSelectedKpiKeys] = useState([]);
  const [exportYears, setExportYears] = useState([selectedYear]);
  const [exportScope, setExportScope] = useState('all_months');
  const [specificMonth, setSpecificMonth] = useState(selectedSubPeriod || 'Jan');
  const [specificQuarter, setSpecificQuarter] = useState('Q1');
  const [specificSemester, setSpecificSemester] = useState('H1');
  const [yearsDropdownOpen, setYearsDropdownOpen] = useState(false);
  const yearsDropdownRef = useRef(null);
  const [delimiter, setDelimiter] = useState(';');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Reset selection to all indicators whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedKpiKeys(kpiCatalog.map((k) => k.key));
      setExportYears([selectedYear]);
      setSpecificMonth(selectedSubPeriod && MONTHS_LIST.includes(selectedSubPeriod) ? selectedSubPeriod : 'Jan');
      setExportSuccess(false);
      setYearsDropdownOpen(false);
    }
  }, [isOpen, kpiCatalog, selectedYear, selectedSubPeriod]);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (yearsDropdownOpen) {
          setYearsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, yearsDropdownOpen]);

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

  // Preview of the rows that will be generated
  const previewRows = useMemo(() => {
    if (!isOpen || selectedKpiObjects.length === 0 || exportYears.length === 0) return [];
    return buildConsolidatedRows({
      selectedKpis: selectedKpiObjects,
      datasets,
      years: exportYears,
      scope: exportScope,
      selectedSubPeriod,
      specificMonth,
      specificQuarter,
      specificSemester,
    });
  }, [isOpen, selectedKpiObjects, datasets, exportYears, exportScope, selectedSubPeriod, specificMonth, specificQuarter, specificSemester]);

  if (!isOpen) return null;

  const isAllSelected = selectedKpiKeys.length === kpiCatalog.length;
  const isAllYearsSelected = exportYears.length === availableYears.length;

  const yearsSummaryLabel = isAllYearsSelected
    ? 'All Years'
    : exportYears.length === 0
    ? 'No year selected'
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

  const handleExport = () => {
    if (previewRows.length === 0) return;

    const yearsLabel =
      isAllYearsSelected ? 'all_years' : exportYears.length ? exportYears.join('-') : 'no_year';
    let scopeLabel = exportScope;
    if (exportScope === 'quarterly') scopeLabel = `quarterly_${specificQuarter}`;
    else if (exportScope === 'semiannual') scopeLabel = `semiannual_${specificSemester}`;
    const filename = `export_report_${yearsLabel}_${scopeLabel}.csv`;

    downloadConsolidatedCsv({
      rows: previewRows,
      delimiter,
      filename,
    });

    setExportSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content export-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={22} className="modal-title-icon" />
            <div>
              <h3>Export Consolidated Report</h3>
              <p>Configure the indicators and period to generate the spreadsheet (.csv)</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="export-modal__body">
          {/* Section 1: KPI Selection */}
          <div className="export-section">
            <div className="export-section__header">
              <div className="export-section__title">
                <Layers size={16} />
                Indicators to Export
                <span className="export-section__badge">
                  {selectedKpiKeys.length} of {kpiCatalog.length} selected
                </span>
              </div>
              <div className="export-section__actions">
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleSelectAll}
                  disabled={isAllSelected}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--border)' }}>•</span>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleClearAll}
                  disabled={selectedKpiKeys.length === 0}
                >
                  Clear All
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
                        <span className="export-kpi-card__name">{kpi.name}</span>
                        <span className="export-kpi-card__unit">Unit: {kpi.unit}</span>
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
                Time Period Scope
              </div>
            </div>

            <div className="export-options-row">
              {/* Year Dropdown (closed, opens a checkbox list) */}
              <div className="export-field-group" style={{ flex: 1 }} ref={yearsDropdownRef}>
                <label className="export-label">Years:</label>
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
                          Select All
                        </button>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <button
                          type="button"
                          className="btn-link-action"
                          onClick={handleClearAllYears}
                          disabled={exportYears.length === 0}
                        >
                          Clear All
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

              {/* Delimiter */}
              <div className="export-field-group">
                <label className="export-label">Format / CSV Delimiter:</label>
                <select
                  className="export-select"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                >
                  <option value=";">Semicolon ( ; ) — Excel Brazil (Recommended)</option>
                  <option value=",">Comma ( , ) — International Standard</option>
                </select>
              </div>
            </div>

            {/* Scope Pills */}
            <div className="export-field-group" style={{ marginTop: '0.5rem' }}>
              <label className="export-label">Period Granularity:</label>
              <div className="export-scope-pills">
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'all_months' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('all_months')}
                >
                  Full Monthly Series (Jan to Dec)
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'current_period' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('current_period')}
                >
                  Active Dashboard Period ({selectedSubPeriod})
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'specific_month' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('specific_month')}
                >
                  Specific Month...
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'quarterly' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('quarterly')}
                >
                  Quarterly (aggregated)
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'semiannual' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('semiannual')}
                >
                  Semiannual (aggregated)
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'annual' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('annual')}
                >
                  Annual (aggregated)
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

              {AGGREGATED_SCOPE_HINT[exportScope] && (
                <p className="export-scope-hint">{AGGREGATED_SCOPE_HINT[exportScope]}</p>
              )}
            </div>
          </div>

          {/* Section 3: Summary / Preview */}
          <div className="export-section">
            {selectedKpiKeys.length === 0 ? (
              <div className="export-summary-banner export-summary-banner--warning">
                <AlertTriangle size={18} />
                <span className="export-summary-banner__text">
                  No indicator selected. Please check at least one indicator above.
                </span>
              </div>
            ) : exportYears.length === 0 ? (
              <div className="export-summary-banner export-summary-banner--warning">
                <AlertTriangle size={18} />
                <span className="export-summary-banner__text">
                  No year selected. Please check at least one year above.
                </span>
              </div>
            ) : exportSuccess ? (
              <div className="export-summary-banner" style={{ borderColor: 'var(--success, #22c55e)', color: 'var(--success, #22c55e)' }}>
                <CheckCircle2 size={18} />
                <span className="export-summary-banner__text" style={{ color: 'var(--success, #22c55e)' }}>
                  Download started successfully! The CSV file is ready to use in Excel.
                </span>
              </div>
            ) : (
              <div className="export-summary-banner">
                <FileSpreadsheet size={18} style={{ color: 'var(--brand-500)' }} />
                <span className="export-summary-banner__text">
                  The spreadsheet will contain <span className="export-summary-banner__count">{previewRows.length} records</span> consolidated with columns for result, target, achievement, status, and unit.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="export-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExport}
            disabled={selectedKpiKeys.length === 0 || exportYears.length === 0 || previewRows.length === 0 || exportSuccess}
          >
            <Download size={16} />
            {exportSuccess
              ? 'Exported Successfully!'
              : `Export Spreadsheet (${selectedKpiKeys.length} indicator${selectedKpiKeys.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </div>
    </div>
  );
}
