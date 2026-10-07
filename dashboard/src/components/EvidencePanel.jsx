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
  uploadEvidence,
} from '../services/api';
import { useTranslation } from 'react-i18next';

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['ppt', 'pptx'];

const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const extractErrorMessage = (err, t) => {
  if (!err) return t('evidence.err_unexp');
  if (typeof err === 'string') return err;

  if (Array.isArray(err)) {
    return err.map((item) => item.msg || JSON.stringify(item)).join(' | ');
  }

  if (err.detail) {
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail.map((item) => item.msg || JSON.stringify(item)).join(' | ');
    }
  }

  return err.message || t('evidence.err_op');
};

export default function EvidencePanel({ kpiKey, kpiName, selectedYear, periodLabel }) {
  const { t, i18n } = useTranslation();
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
      const data = await fetchEvidences({ kpiType: kpiKey, year: fullYear, month: periodLabel });
      setFiles(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      setFiles([]);
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
        setError(t('evidence.err_ext'));
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(t('evidence.err_size').replace('{name}', file.name));
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
        await uploadEvidence({
          file,
          kpiType: kpiKey,
          year: fullYear,
          month: periodLabel,
        });
      }
      setMessage(
        pendingFiles.length === 1
          ? t('evidence.msg_saved_1').replace('{name}', pendingFiles[0].name)
          : t('evidence.msg_saved_n').replace('{count}', pendingFiles.length)
      );
      setPendingFiles([]);
      await loadFiles();
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        setError(extractErrorMessage(err, t));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadEvidence(file.id);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        setError(extractErrorMessage(err, t));
      }
    }
  };

  const handleDelete = async (file) => {
    try {
      await deleteEvidence(file.id);
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      setMessage(t('evidence.msg_del').replace('{name}', file.name));
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        setError(extractErrorMessage(err, t));
      }
    }
  };

  return (
    <div className="evidence-wrapper">
      <div className="evidence-panel__title">
        <span>{t('evidence.title')}</span>
        <span className="evidence-panel__title-sep"> - </span>
        <small>
          {kpiName} · {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].includes(periodLabel) ? t('months.' + periodLabel) : periodLabel}/{selectedYear?.substring(1)}
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
        <strong>{t('evidence.drag_title')}</strong>
        <span>{t('evidence.drag_desc')}</span>
        <small>{t('evidence.drag_hint')}</small>
      </div>

      {pendingFiles.length > 0 && (
        <div className="evidence-panel__pending-container">
          <div className="evidence-panel__section-header">
            <span>{t('evidence.pending_title')}</span>
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
                  {t('evidence.badge_pending')}
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
                <span>{t('evidence.btn_saving')}</span>
              </>
            ) : (
              <>
                <Upload size={15} />
                <span>{t('evidence.btn_save')}</span>
              </>
            )}
          </button>
        </div>
      )}

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

      {files.length > 0 && (
        <div className="evidence-panel__file-list">
          <div className="evidence-panel__section-header">
            <span>{t('evidence.saved_title').replace('{count}', files.length)}</span>
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
                  {file.createdAt ? new Date(file.createdAt).toLocaleString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'ko' ? 'ko-KR' : 'en-US') : ''}
                </span>
                <span className="evidence-panel__badge evidence-panel__badge--saved">
                  <CheckCircle2 size={12} />
                  {t('evidence.badge_saved')}
                </span>
              </div>
              <div className="evidence-panel__file-actions">
                <button
                  type="button"
                  title={t('evidence.btn_dl')}
                  aria-label={t('evidence.btn_dl')}
                  className="evidence-panel__action-btn evidence-panel__action-btn--download"
                  onClick={() => handleDownload(file)}
                >
                  <Download size={15} />
                </button>
                <button
                  type="button"
                  title={t('evidence.btn_del')}
                  aria-label={t('evidence.btn_del')}
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
