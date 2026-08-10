import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, FileText } from 'lucide-react';

export default function ActionPlanPanel({ kpiName, period, insight }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');

  return (
    <div className={`action-plan-panel ${isExpanded ? 'action-plan-panel--expanded' : ''}`}>
      <div className="action-plan-panel__header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <FileText size={16} style={{ color: 'var(--highlight-accent)' }} />
          Plano de Ação — {kpiName}
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
          <label className="small-label">Anotações / Próximos Passos</label>
          <textarea
            className="action-plan-panel__textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva as ações a serem tomadas..."
          />
          <p className="action-plan-panel__note">Observações salvas localmente (protótipo)</p>
        </div>
      </div>
    </div>
  );
}