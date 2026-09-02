import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

/**
 * Evidências anexadas a um indicador/período.
 *
 * Não existe endpoint de upload no backend ainda, então aqui só ficam
 * registrados os metadados do arquivo escolhido (nome, tamanho, horário),
 * no localStorage. O nome vem do arquivo que o usuário realmente
 * selecionou — nada é gerado artificialmente.
 */
export default function EvidencePanel({
  kpiKey,
  kpiName,
  selectedYear,
  periodLabel,
}) {
  const storageKey = `ev_${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${periodLabel || 'Jan'}`;
  const inputRef = useRef(null);

  // Read files from localStorage on initialization
  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Load files when storageKey changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setFiles(saved ? JSON.parse(saved) : []);
  }, [storageKey]);

  const persist = (next) => {
    setFiles(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const added = selected.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: formatSize(file.size),
      addedAt: timestamp,
    }));

    persist([...files, ...added]);
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
  };

  const handleRemoveFile = (id) => {
    persist(files.filter((f) => f.id !== id));
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <div className="evidence-panel__title">Evidences — {kpiName} ({periodLabel})</div>

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      <button type="button" className="evidence-panel" onClick={openPicker}>
        <div className="evidence-panel__dropzone">
          <div className="evidence-panel__dropzone-icon">
            <Upload size={28} />
          </div>
          <div className="evidence-panel__dropzone-text">
            Click to attach files
          </div>
          <div className="evidence-panel__dropzone-hint">
            Only the file reference is saved locally — there is no upload to the server yet.
          </div>
        </div>
      </button>

      {files.length > 0 && (
        <div className="evidence-panel__file-list">
          {files.map((file) => (
            <div key={file.id} className="evidence-panel__file">
              <div className="evidence-panel__file-info">
                <FileText size={14} />
                <span>{file.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {[file.size, file.addedAt].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button
                type="button"
                className="evidence-panel__file-remove"
                onClick={handleRemoveFile.bind(null, file.id)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
