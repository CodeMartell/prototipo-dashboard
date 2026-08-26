import React from 'react';
import { X, Database, HelpCircle, Calculator, CheckCircle2, Layers } from 'lucide-react';

const METRICS_EXPLANATIONS = [
  {
    id: 'logisticCost',
    title: '1. Total Logistics Cost (Logistic Cost KPI TV %)',
    formula: 'Logistic Cost (%) = (Total Logistics Cost + Incident Costs) / Gross Production Value',
    source: 'ARUM System (Freight) + Incident Cost System (Claims/Demurrage) + GERP (Production)',
    badge: 'Lower is Better',
    badgeColor: 'var(--brand-800)',
    concept: 'Percentage of total logistics movement cost relative to the financial value of gross TV production.',
    rationale: 'Measures freight efficiency relative to factory financial volume. If production increases, nominal freight goes up, but the percentage should decline or stay stable to reflect scale efficiency.',
    example: 'In Jan/26, $2.56M spent on freight + incidentals for $47.63M of production = 5.38% (against a target of 6.48%).'
  },
  {
    id: 'airFreight',
    title: '2. Average Cost — Air Freight (Air Freight KPI TV %)',
    formula: 'Air Freight (%) = Emergency Air Freight Cost / Gross Production Value',
    source: 'ARUM System (Emergency Air Transport Orders) + GERP',
    badge: 'Crisis Monitoring',
    badgeColor: 'var(--accent-teal)',
    concept: 'Proportion of unplanned emergency air freight costs relative to total production.',
    rationale: 'Air freight costs 4x to 8x more than ocean transport. Monitoring this metric separately highlights critical supply chain bottlenecks and vendor delays requiring urgent transport.',
    example: 'In Mar/26, the metric reached 0.74% (target was 0.22%), triggering an alert regarding emergency freight spikes for critical parts.'
  },
  {
    id: 'logisticsVsProd',
    title: '3. Cost per Production Value (Cost x Product Amount Ratio)',
    formula: 'Ratio = Nominal Logistics Cost (MUSD) / Nominal Production Value (MUSD)',
    source: 'Master Sheet (dados.xlsx — Tab 3) consolidating GERP and Financials',
    badge: 'Direct Financial Ratio',
    badgeColor: 'var(--accent-violet)',
    concept: 'Pure unweighted relationship between freight expense in USD and production value in USD.',
    rationale: 'Provides transparent visibility into structural logistics cost variations relative to nominal volume, free from variable target adjustments.',
    example: 'In May/26: $2.70M USD cost / $57.15M USD production = 0.0472 (or 4.72%).'
  },
  {
    id: 'totalProd',
    title: '4. Total Production Amount (Production Amount — MUSD)',
    formula: 'Total Value = Sum of nominal values (MUSD) reported by GERP',
    source: 'GERP (LG Proprietary ERP — Billing & Production Module)',
    badge: 'Budgetary Denominator',
    badgeColor: 'var(--accent-amber)',
    concept: 'Gross financial amount corresponding to TV units manufactured in the period.',
    rationale: 'Base financial metric of the plant. Helps clarify whether total cost fluctuations stem from production volume shifts or freight rate increases.',
    example: 'Y26 YTD (Jan-May), the plant manufactured $277.94 MUSD in electronics.'
  },
  {
    id: 'accumulatedCost',
    title: '5. Accumulated Logistics Cost (Logistics Cost — MUSD)',
    formula: 'Accumulated Cost = Sum of monthly transport disbursements (MUSD)',
    source: 'ARUM System + Treasury/Finance Reports',
    badge: 'Gross Financial Volume',
    badgeColor: 'var(--brand-800)',
    concept: 'Total USD cash outlay by LG for transportation and warehousing.',
    rationale: 'Essential for cash flow control and volume contract negotiations with shipping lines and carriers.',
    example: 'Y26 YTD (Jan-May), total freight outlay reached $12.23 MUSD.'
  },
  {
    id: 'achievement',
    title: '6. Achievement Ratio (Achievement Ratio)',
    formula: 'Achievement = Target (%) / Result (%)',
    source: 'Dashboard analytical calculation comparing Planned vs Actual',
    badge: 'Performance KPI',
    badgeColor: 'var(--accent-green)',
    concept: 'Compliance index with the set cost target (where lower cost is better).',
    rationale: 'Since the target represents a maximum spending ceiling, if actual result is lower than target, Target / Result will be greater than 1.0 (100%), indicating budget savings.',
    example: 'Target of 6.48% / Result of 5.38% = 1.205 (120.5% target achievement — 1.1% total cost savings).'
  }
];

export default function MetricsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} className="modal-title-icon" />
            <div>
              <h3>Metrics Guide & Data Origin</h3>
              <p>Logical rationale, formulas, and corporate source systems for executive defense</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="metrics-intro-card">
            <HelpCircle size={18} style={{ color: 'var(--brand-800)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>How to explain these numbers to Management:</strong>
              <p>
                All cost indicators follow the <em>"Lower is Better"</em> principle. 
                Financial data is consolidated from <strong>GERP (LG ERP)</strong> for production volumes 
                and <strong>ARUM System / Incident Cost System</strong> for freight expenses and logistics contingencies.
              </p>
            </div>
          </div>

          <div className="metrics-grid">
            {METRICS_EXPLANATIONS.map((item) => (
              <div key={item.id} className="metric-card-detail">
                <div className="metric-card-detail__header">
                  <h4>{item.title}</h4>
                  <span className="metric-badge" style={{ backgroundColor: item.badgeColor + '22', color: item.badgeColor, borderColor: item.badgeColor + '44' }}>
                    {item.badge}
                  </span>
                </div>

                <div className="metric-card-detail__formula">
                  <Calculator size={14} />
                  <code>{item.formula}</code>
                </div>

                <div className="metric-card-detail__row">
                  <strong><Layers size={13} /> Concept:</strong> {item.concept}
                </div>

                <div className="metric-card-detail__row">
                  <strong><Database size={13} /> Data Source:</strong> {item.source}
                </div>

                <div className="metric-card-detail__row">
                  <strong><CheckCircle2 size={13} /> Business Rationale:</strong> {item.rationale}
                </div>

                <div className="metric-card-detail__example">
                  <strong>Practical Example:</strong> {item.example}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn--primary" onClick={onClose}>
            Understood, close guide
          </button>
        </div>
      </div>
    </div>
  );
}