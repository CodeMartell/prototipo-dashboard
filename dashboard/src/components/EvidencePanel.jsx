import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const MOCK_FILES = [
  'War_Room_Report_Jan2026.pdf',
  'Email_Evidencia_Frete_Aereo.png',
  'Relatorio_Logistica_Q1_2026.xlsx',
];

export default function EvidencePanel({ kpiName }) {
  const [files, setFiles] = useState([]);

  const handleAddFile = () => {
    const randomFile = MOCK_FILES[Math.floor(Math.random() * MOCK_FILES.length)];
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setFiles((prev) => [...prev, { name: randomFile, addedAt: timestamp, id: Date.now() }]);
  };

  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div>
      <div className="evidence-panel__title">Evidências — {kpiName}</div>
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
