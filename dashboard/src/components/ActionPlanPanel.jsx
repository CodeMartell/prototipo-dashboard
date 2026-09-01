import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Save, Trash2 } from 'lucide-react';

const UPDATED_PREFIX = 'ap_updated_';
const PERIOD_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getSavedPlans = (kpiKey, selectedYear) => {
  const safeKpiKey = kpiKey || 'kpi';
  const safeYear = selectedYear || 'Y26';
  const prefix = `ap_${safeKpiKey}_${safeYear}_`;
  const plans = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;

    const notes = localStorage.getItem(key)?.trim();
    if (!notes) continue;

    const period = key.slice(prefix.length);
    plans.push({
      key,
      period,
      notes,
      updatedAt: localStorage.getItem(`${UPDATED_PREFIX}${safeKpiKey}_${safeYear}_${period}`),
    });
  }

  return plans.sort((a, b) => {
    const aIndex = PERIOD_ORDER.indexOf(a.period);
    const bIndex = PERIOD_ORDER.indexOf(b.period);
    if (aIndex === -1 || bIndex === -1) return a.period.localeCompare(b.period);
    return aIndex - bIndex;
  });
};

export default function ActionPlanPanel({
  kpiKey,
  kpiName,
  _period,
  selectedYear,
  periodLabel,
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded to show context
  
  const storageKey = `ap_${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${periodLabel || 'Jan'}`;

  // Read notes from localStorage on initialization
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(storageKey) || '';
  });
  const [savedPlans, setSavedPlans] = useState(() => getSavedPlans(kpiKey, selectedYear));
  
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

  const persistNotes = useCallback(() => {
    const trimmedNotes = notes.trim();
    const updatedKey = `${UPDATED_PREFIX}${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${periodLabel || 'Jan'}`;

    if (trimmedNotes) {
      localStorage.setItem(storageKey, trimmedNotes);
      localStorage.setItem(updatedKey, new Date().toISOString());
    } else {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(updatedKey);
    }

    setSavedPlans(getSavedPlans(kpiKey, selectedYear));
    setSaveStatus('saved');
  }, [kpiKey, notes, periodLabel, selectedYear, storageKey]);

  // Load notes when the storageKey changes
  useEffect(() => {
    setNotes(localStorage.getItem(storageKey) || '');
    setSaveStatus('saved');
  }, [storageKey]);

  // The history belongs to the KPI/year, not to the currently selected month.
  // Keeping this effect independent from storageKey prevents the cards from
  // disappearing while the user navigates between periods.
  useEffect(() => {
    setSavedPlans(getSavedPlans(kpiKey, selectedYear));
  }, [kpiKey, selectedYear]);

  const removePlan = (plan) => {
    localStorage.removeItem(plan.key);
    localStorage.removeItem(`${UPDATED_PREFIX}${kpiKey || 'kpi'}_${selectedYear || 'Y26'}_${plan.period}`);
    if (plan.key === storageKey) setNotes('');
    setSavedPlans(getSavedPlans(kpiKey, selectedYear));
  };

  const formatUpdatedAt = (value) => {
    if (!value) return 'Saved previously';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved previously';
    return `Updated ${date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`;
  };

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
        <div>
          <label className="small-label">Notes / Next Steps</label>
          <textarea
            className="action-plan-panel__textarea"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaveStatus('saving');
            }}
            placeholder={`Describe actions to be taken for the period of ${periodLabel}...`}
          />
          
          <div className="action-plan-panel__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
            <p className="action-plan-panel__note">
              Linked to: {periodLabel} / {selectedYear ? selectedYear.substring(1) : ''}
            </p>
            <div className="action-plan-panel__save-controls">
              <span className={`action-plan-panel__status action-plan-panel__status--${saveStatus}`}>
                {saveStatus === 'saving' ? 'Unsaved changes' : '✓ Saved locally'}
              </span>
              <button
                type="button"
                className="action-plan-panel__save-btn"
                onClick={persistNotes}
                disabled={saveStatus === 'saved'}
              >
                <Save size={14} />
                Save action plan
              </button>
            </div>
          </div>

          {savedPlans.length > 0 && (
            <section className="action-plan-history" aria-label="Saved action plans">
              <div className="action-plan-history__heading">
                <h4>Saved action plans</h4>
                <span>{savedPlans.length} {savedPlans.length === 1 ? 'period' : 'periods'}</span>
              </div>
              <div className="action-plan-history__grid">
                {savedPlans.map((plan) => (
                  <article
                    className={`action-plan-card ${plan.key === storageKey ? 'action-plan-card--active' : ''}`}
                    key={plan.key}
                  >
                    <div className="action-plan-card__header">
                      <span className="action-plan-card__period">
                        {plan.period}/{selectedYear ? selectedYear.substring(1) : ''}
                      </span>
                      <button
                        type="button"
                        className="action-plan-card__remove"
                        title={`Remove action plan for ${plan.period}`}
                        aria-label={`Remove action plan for ${plan.period}`}
                        onClick={() => removePlan(plan)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p>{plan.notes}</p>
                    <small>{formatUpdatedAt(plan.updatedAt)}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
