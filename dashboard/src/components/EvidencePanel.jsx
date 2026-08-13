import { useState, useEffect } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const MOCK_FILES = [
  'War_Room_Report_Jan2026.pdf',
  'Email_Evidencia_Frete_Aereo.png',
  'Relatorio_Logistica_Q1_2026.xlsx',
];

export default function EvidencePanel({
  kpiKey,
  kpiName,
  selectedYear,
  periodLabel,
}) {
  const storageKey = `ev_${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${periodLabel || 'Jan'}`;

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

  const handleAddFile = () => {
    const randomFile = MOCK_FILES[Math.floor(Math.random() * MOCK_FILES.length)];
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newFiles = [...files, { name: randomFile, addedAt: timestamp, id: Date.now() }];
    setFiles(newFiles);
    localStorage.setItem(storageKey, JSON.stringify(newFiles));
  };

  const handleRemoveFile = (id) => {
    const newFiles = files.filter((f) => f.id !== id);
    setFiles(newFiles);
    localStorage.setItem(storageKey, JSON.stringify(newFiles));
  };

  return (
    <div>
      <div className="evidence-panel__title">Evidências — {kpiName} ({periodLabel})</div>
      <div className="evidence-panel" onClick={handleAddFile}>
        <div className="evidence-panel__dropzone">
          <div className="evidence-panel__dropzone-icon">
            <Upload size={28} />
          </div>
          <div className="evidence-panel__dropzone-text">
            Arraste arquivos ou clique para anexar
          </div>
          <div className="evidence-panel__dropzone-hint">
            Anexe prints ou referências do relatório original recebido por e-mail
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="evidence-panel__file-list">
          {files.map((file) => (
            <div key={file.id} className="evidence-panel__file">
              <div className="evidence-panel__file-info">
                <FileText size={14} />
                <span>{file.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{file.addedAt}</span>
              </div>
              <button
                className="evidence-panel__file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(file.id);
                }}
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
