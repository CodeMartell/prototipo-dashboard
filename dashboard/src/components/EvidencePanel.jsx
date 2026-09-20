import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  FileSliders,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  deleteEvidence,
  downloadEvidence,
  fetchEvidences,
  UnauthorizedError,
  uploadEvidence,
} from '../services/api';

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['ppt', 'pptx'];

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function EvidencePanel({ kpiKey, kpiName, selectedYear, periodLabel }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fullYear = selectedYear?.startsWith('Y')
    ? `20${selectedYear.substring(1)}`
    : selectedYear;

  const loadFiles = useCallback(async () => {
    try {
      const data = await fetchEvidences(kpiKey, fullYear, periodLabel);
      setFiles(data || []);
      setError('');
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
    }
  }, [kpiKey, fullYear, periodLabel]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSelectFiles = (incomingFiles) => {
    const candidates = Array.from(incomingFiles || []);
    if (!candidates.length) return;

    setMessage('');
    setError('');

    const validated = [];
    for (const file of candidates) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError('Please upload only PowerPoint presentations (.ppt or .pptx).');
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`${file.name} exceeds the 25 MB limit.`);
        continue;
      }
      validated.push(file);
    }

    if (validated.length > 0) {
      setPendingFiles(validated);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSavePending = async () => {
    if (!pendingFiles.length) return;

    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      for (const file of pendingFiles) {
        await uploadEvidence(kpiKey, fullYear, periodLabel, file);
      }
      setMessage(
        pendingFiles.length === 1
          ? `${pendingFiles[0].name} saved successfully to the platform.`
          : `${pendingFiles.length} files saved successfully to the platform.`
      );
      setPendingFiles([]);
      await loadFiles();
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        setError(err.message || 'Could not save file to the platform.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadEvidence(file.id, file.name);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) setError(err.message || 'Could not download the file.');
    }
  };

  const handleDelete = async (file) => {
    try {
      await deleteEvidence(file.id);
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      setMessage(`${file.name} deleted successfully.`);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) setError(err.message || 'Could not delete the file.');
    }
  };

  return (
    <div className="evidence-wrapper">
      <div className="evidence-panel__title">
        <span>Evidence</span>
        <span className="evidence-panel__title-sep"> - </span>
        <small>
          {kpiName} · {periodLabel}/{selectedYear?.substring(1)}
        </small>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        multiple
        hidden
        onChange={(e) => handleSelectFiles(e.target.files)}
      />

      <div
        className={`evidence-panel ${isDragging ? 'evidence-panel--dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleSelectFiles(e.dataTransfer.files);
        }}
      >
        <div className="evidence-panel__dropzone-icon">
          <Upload size={27} />
        </div>
        <strong>Upload PowerPoint</strong>
        <span>Drag file here or click to select</span>
        <small>.PPT or .PPTX · 25 MB maximum per file</small>
      </div>

      {/* Selected file pending upload (No 'X' button) */}
      {pendingFiles.length > 0 && (
        <div className="evidence-panel__pending-container">
          <div className="evidence-panel__section-header">
            <span>Selected file</span>
          </div>

          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="evidence-panel__file evidence-panel__file--pending">
              <div className="evidence-panel__file-icon">
                <FileSliders size={18} />
              </div>
              <div className="evidence-panel__file-info">
                <strong title={file.name}>{file.name}</strong>
                <span>{formatSize(file.size)}</span>
                <span className="evidence-panel__badge evidence-panel__badge--pending">
                  <Clock size={12} />
                  Pending upload
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="evidence-panel__btn-save"
            disabled={isSaving}
            onClick={handleSavePending}
          >
            {isSaving ? (
              <>
                <LoaderCircle size={15} className="evidence-panel__spinner" />
                <span>Saving to platform...</span>
              </>
            ) : (
              <>
                <Upload size={15} />
                <span>Save to platform</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Message feedback */}
      {message && (
        <div className="evidence-panel__success" role="status">
          <CheckCircle2 size={15} /> {message}
        </div>
      )}
      {error && (
        <div className="evidence-panel__message" role="alert">
          {error}
        </div>
      )}

      {/* Saved files list — strictly Download and Delete */}
      {files.length > 0 && (
        <div className="evidence-panel__file-list">
          <div className="evidence-panel__section-header">
            <span>Saved records ({files.length})</span>
          </div>
          {files.map((file) => (
            <div key={file.id} className="evidence-panel__file">
              <div className="evidence-panel__file-icon">
                <FileSliders size={18} />
              </div>
              <div className="evidence-panel__file-info">
                <strong title={file.name}>{file.name}</strong>
                <span>
                  {formatSize(file.size)} ·{' '}
                  {file.createdAt ? new Date(file.createdAt).toLocaleString('en-US') : ''}
                </span>
                <span className="evidence-panel__badge evidence-panel__badge--saved">
                  <CheckCircle2 size={12} />
                  Saved successfully
                </span>
              </div>
              <div className="evidence-panel__file-actions">
                <button
                  type="button"
                  title="Download file"
                  aria-label={`Download ${file.name}`}
                  className="evidence-panel__action-btn evidence-panel__action-btn--download"
                  onClick={() => handleDownload(file)}
                >
                  <Download size={15} />
                </button>
                <button
                  type="button"
                  title="Delete evidence"
                  aria-label={`Delete ${file.name}`}
                  className="evidence-panel__action-btn evidence-panel__action-btn--delete"
                  onClick={() => handleDelete(file)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

     
    </div>
  );
}