import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Save, Trash2 } from 'lucide-react';
import { addActionPlan, getActionPlans, removeActionPlan } from '../utils/actionPlanStorage';

export default function ActionPlanPanel({
  kpiKey,
  kpiName,
  _period,
  selectedYear,
  periodLabel,
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded to show context
  
  const [notes, setNotes] = useState('');
  const [savedPlans, setSavedPlans] = useState(() => getActionPlans(kpiKey, selectedYear));
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState(() => new Set([periodLabel]));
  
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

  const persistNotes = useCallback(() => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) return;
    addActionPlan(kpiKey, selectedYear, periodLabel || 'Jan', trimmedNotes);
    setNotes('');
    setSavedPlans(getActionPlans(kpiKey, selectedYear));
    setSaveStatus('saved');
  }, [kpiKey, notes, periodLabel, selectedYear]);

  // O campo sempre representa um novo plano; trocar de período não carrega
  // um card existente para edição nem provoca sobrescrita acidental.
  useEffect(() => {
    setNotes('');
    setSaveStatus('saved');
    setExpandedPeriods((current) => new Set([...current, periodLabel]));
  }, [kpiKey, selectedYear, periodLabel]);

  // The history belongs to the KPI/year, not to the currently selected month.
  // Keeping this effect independent from storageKey prevents the cards from
  // disappearing while the user navigates between periods.
  useEffect(() => {
    setSavedPlans(getActionPlans(kpiKey, selectedYear));
  }, [kpiKey, selectedYear]);

  const removePlan = (plan) => {
    removeActionPlan(kpiKey, selectedYear, plan);
    setSavedPlans(getActionPlans(kpiKey, selectedYear));
  };

  const formatUpdatedAt = (value) => {
    if (!value) return 'Saved previously';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved previously';
    return `Updated ${date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}`;
  };

  const groupedPlans = useMemo(() => {
    const groups = new Map();
    savedPlans.forEach((plan) => {
      if (!groups.has(plan.period)) groups.set(plan.period, []);
      groups.get(plan.period).push(plan);
    });
    return [...groups.entries()].map(([period, plans]) => ({ period, plans }));
  }, [savedPlans]);

  const selectedPeriodCount = savedPlans.filter((plan) => plan.period === periodLabel).length;
  const hasOtherPeriods = savedPlans.some((plan) => plan.period !== periodLabel);
  const visibleGroups = showAllPeriods
    ? groupedPlans
    : groupedPlans.filter((group) => group.period === periodLabel);

  const togglePeriod = (period) => {
    setExpandedPeriods((current) => {
      const next = new Set(current);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
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
                disabled={!notes.trim()}
              >
                <Save size={14} />
                Save action plan
              </button>
            </div>
          </div>

          {savedPlans.length > 0 && (
            <section className="action-plan-history" aria-label="Saved action plans">
              <div className="action-plan-history__heading">
                <div>
                  <h4>Saved action plans</h4>
                  <span>
                    {selectedPeriodCount} {selectedPeriodCount === 1 ? 'plan' : 'plans'} for {periodLabel}/{selectedYear ? selectedYear.substring(1) : ''}
                  </span>
                </div>
                {hasOtherPeriods && (
                  <button
                    type="button"
                    className="action-plan-history__toggle-all"
                    onClick={() => setShowAllPeriods((current) => !current)}
                  >
                    {showAllPeriods ? `Show only ${periodLabel}` : 'View all periods'}
                  </button>
                )}
              </div>
              {visibleGroups.length === 0 ? (
                <p className="action-plan-history__empty">No action plans saved for this period.</p>
              ) : visibleGroups.map((group) => {
                const isOpen = expandedPeriods.has(group.period);
                return (
                  <div className="action-plan-period-group" key={group.period}>
                    <button
                      type="button"
                      className="action-plan-period-group__header"
                      onClick={() => togglePeriod(group.period)}
                      aria-expanded={isOpen}
                    >
                      <span>{group.period}/{selectedYear ? selectedYear.substring(1) : ''}</span>
                      <span>{group.plans.length} {group.plans.length === 1 ? 'plan' : 'plans'}</span>
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {isOpen && (
                      <div className="action-plan-history__grid">
                        {group.plans.map((plan, index) => (
                          <article
                            className={`action-plan-card ${plan.period === periodLabel ? 'action-plan-card--active' : ''}`}
                            key={plan.id}
                          >
                            <div className="action-plan-card__header">
                              <span className="action-plan-card__period">Plan {index + 1}</span>
                              <button
                                type="button"
                                className="action-plan-card__remove"
                                title={`Remove action plan for ${plan.period}`}
                                aria-label={`Remove action plan ${index + 1} for ${plan.period}`}
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
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
