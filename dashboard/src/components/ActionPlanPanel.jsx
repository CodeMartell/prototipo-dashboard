import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, FileText } from 'lucide-react';

export default function ActionPlanPanel({
  kpiKey,
  kpiName,
  _period,
  selectedYear,
  periodLabel,
  insight,
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded to show context
  
  const storageKey = `ap_${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${periodLabel || 'Jan'}`;

  // Read notes from localStorage on initialization
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(storageKey) || '';
  });
  
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

  // Load notes when the storageKey changes
  useEffect(() => {
    setNotes(localStorage.getItem(storageKey) || '');
    setSaveStatus('saved');
  }, [storageKey]);

  // Debounced save to localStorage
  useEffect(() => {
    const savedVal = localStorage.getItem(storageKey) || '';
    if (notes === savedVal) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, notes);
      setSaveStatus('saved');
    }, 500);

    return () => clearTimeout(timer);
  }, [notes, storageKey]);

  return (
    <div className={`action-plan-panel ${isExpanded ? 'action-plan-panel--expanded' : ''}`}>
      <div className="action-plan-panel__header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FileText size={16} style={{ color: 'var(--highlight-accent)' }} />
          Action Plan — {kpiName} ({periodLabel})
        </h3>
        {isExpanded ? (
          <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      <div className="action-plan-panel__body">
        <div className="insight-banner">
          <Lightbulb size={18} style={{ color: 'var(--accent-airfreight)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{insight}</p>
        </div>

        <div style={{ marginTop: 'var(--space-3)' }}>
          <label className="small-label">Notes / Next Steps</label>
          <textarea
            className="action-plan-panel__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Describe actions to be taken for the period of ${periodLabel}...`}
          />
          
          <div className="action-plan-panel__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
            <p className="action-plan-panel__note">
              Linked to: {periodLabel} / {selectedYear ? selectedYear.substring(1) : ''}
            </p>
            <span 
              className="action-plan-panel__status" 
              style={{ 
                fontSize: '0.65rem', 
                color: saveStatus === 'saving' ? 'var(--text-muted)' : 'var(--success)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}
            >
              {saveStatus === 'saving' ? (
                <>
                  <span className="loader-dots">Saving...</span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span> Saved locally
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}