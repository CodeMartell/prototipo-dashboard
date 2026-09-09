import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { buildConsolidatedRows, downloadConsolidatedCsv } from '../utils/exportCsv.js';
import './ExportModal.css';

const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const [exportYear, setExportYear] = useState(selectedYear);
  const [exportScope, setExportScope] = useState('all_months');
  const [specificMonth, setSpecificMonth] = useState(selectedSubPeriod || 'Jan');
  const [delimiter, setDelimiter] = useState(';');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Inicializa a seleção com todos os indicadores quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedKpiKeys(kpiCatalog.map((k) => k.key));
      setExportYear(selectedYear);
      setSpecificMonth(selectedSubPeriod && MONTHS_LIST.includes(selectedSubPeriod) ? selectedSubPeriod : 'Jan');
      setExportSuccess(false);
    }
  }, [isOpen, kpiCatalog, selectedYear, selectedSubPeriod]);

  // Fecha modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista de KPIs selecionados (objetos completos)
  const selectedKpiObjects = useMemo(
    () => kpiCatalog.filter((k) => selectedKpiKeys.includes(k.key)),
    [kpiCatalog, selectedKpiKeys]
  );

  // Pré-visualização das linhas que serão geradas
  const previewRows = useMemo(() => {
    if (!isOpen || selectedKpiObjects.length === 0) return [];
    return buildConsolidatedRows({
      selectedKpis: selectedKpiObjects,
      datasets,
      year: exportYear,
      scope: exportScope,
      selectedSubPeriod,
      specificMonth,
    });
  }, [isOpen, selectedKpiObjects, datasets, exportYear, exportScope, selectedSubPeriod, specificMonth]);

  if (!isOpen) return null;

  const isAllSelected = selectedKpiKeys.length === kpiCatalog.length;

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

  const handleExport = () => {
    if (previewRows.length === 0) return;

    const yearLabel = exportYear === 'all' ? 'todos_anos' : exportYear;
    const scopeLabel = exportScope;
    const filename = `relatorio_indicadores_${yearLabel}_${scopeLabel}.csv`;

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
              <h3>Exportar Relatório Consolidado</h3>
              <p>Configure os indicadores e o período para gerar a planilha (.csv)</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar">
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
                Indicadores a Exportar
                <span className="export-section__badge">
                  {selectedKpiKeys.length} de {kpiCatalog.length} selecionados
                </span>
              </div>
              <div className="export-section__actions">
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleSelectAll}
                  disabled={isAllSelected}
                >
                  Selecionar Todos
                </button>
                <span style={{ color: 'var(--border)' }}>•</span>
                <button
                  type="button"
                  className="btn-link-action"
                  onClick={handleClearAll}
                  disabled={selectedKpiKeys.length === 0}
                >
                  Desmarcar Todos
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
                        aria-label={`Selecionar ${kpi.name}`}
                      />
                      <div className="export-kpi-card__icon" style={{ color: kpi.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="export-kpi-card__info">
                        <span className="export-kpi-card__name">{kpi.name}</span>
                        <span className="export-kpi-card__unit">Unidade: {kpi.unit}</span>
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
                Recorte Temporal do Período
              </div>
            </div>

            <div className="export-options-row">
              {/* Year Select */}
              <div className="export-field-group">
                <label className="export-label">Ano:</label>
                <select
                  className="export-select"
                  value={exportYear}
                  onChange={(e) => setExportYear(e.target.value)}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr.startsWith('Y') ? `20${yr.substring(1)} (${yr})` : yr}
                    </option>
                  ))}
                  <option value="all">Todos os Anos (Base Completa)</option>
                </select>
              </div>

              {/* Delimiter */}
              <div className="export-field-group">
                <label className="export-label">Formato / Delimitador CSV:</label>
                <select
                  className="export-select"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                >
                  <option value=";">Ponto-e-vírgula ( ; ) — Excel Brasil (Recomendado)</option>
                  <option value=",">Vírgula ( , ) — Padrão Internacional</option>
                </select>
              </div>
            </div>

            {/* Scope Pills */}
            <div className="export-field-group" style={{ marginTop: '0.5rem' }}>
              <label className="export-label">Granularidade do Período:</label>
              <div className="export-scope-pills">
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'all_months' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('all_months')}
                >
                  Série Mensal Completa (Jan a Dez)
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'current_period' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('current_period')}
                >
                  Período Ativo do Dashboard ({selectedSubPeriod})
                </button>
                <button
                  type="button"
                  className={`export-scope-pill ${exportScope === 'specific_month' ? 'export-scope-pill--active' : ''}`}
                  onClick={() => setExportScope('specific_month')}
                >
                  Mês Específico...
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
            </div>
          </div>

          {/* Section 3: Summary / Preview */}
          <div className="export-section">
            {selectedKpiKeys.length === 0 ? (
              <div className="export-summary-banner export-summary-banner--warning">
                <AlertTriangle size={18} />
                <span className="export-summary-banner__text">
                  Nenhum indicador selecionado. Por favor, marque pelo menos um indicador acima.
                </span>
              </div>
            ) : exportSuccess ? (
              <div className="export-summary-banner" style={{ borderColor: 'var(--success, #22c55e)', color: 'var(--success, #22c55e)' }}>
                <CheckCircle2 size={18} />
                <span className="export-summary-banner__text" style={{ color: 'var(--success, #22c55e)' }}>
                  Download iniciado com sucesso! O arquivo CSV está pronto para uso no Excel.
                </span>
              </div>
            ) : (
              <div className="export-summary-banner">
                <FileSpreadsheet size={18} style={{ color: 'var(--brand-500)' }} />
                <span className="export-summary-banner__text">
                  A planilha conterá <span className="export-summary-banner__count">{previewRows.length} registros</span> consolidados com colunas de resultado, meta, atingimento, semáforo e unidade.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="export-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleExport}
            disabled={selectedKpiKeys.length === 0 || previewRows.length === 0 || exportSuccess}
          >
            <Download size={16} />
            {exportSuccess
              ? 'Exportado com Sucesso!'
              : `Exportar Planilha (${selectedKpiKeys.length} indicador${selectedKpiKeys.length === 1 ? '' : 'es'})`}
          </button>
        </div>
      </div>
    </div>
  );
}
