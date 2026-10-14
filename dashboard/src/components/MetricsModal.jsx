import { useState, useMemo } from 'react';
import { AlertCircle, Calculator, CheckCircle2, ChevronRight, Database, FileSpreadsheet, HelpCircle, Layers, Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getMetrics = (t) => [
  {
    id: 'warRoom', name: 'War Room Report', descriptor: t('metrics_modal.m_war_desc'), unit: '%', badge: t('metrics_modal.m_war_badge'), color: '#3B82F6',
    formula: t('metrics_modal.m_war_form'),
    concept: t('metrics_modal.m_war_conc'),
    source: t('metrics_modal.m_war_src'),
    businessRule: t('metrics_modal.m_war_biz'),
    statusRule: t('metrics_modal.m_war_stat'),
    example: t('metrics_modal.m_war_ex'),
  },
  {
    id: 'airFreight', name: 'Air Freight', descriptor: t('metrics_modal.m_air_desc'), unit: '%', badge: t('metrics_modal.m_air_badge'), color: '#38BDF8',
    formula: t('metrics_modal.m_air_form'),
    concept: t('metrics_modal.m_air_conc'),
    source: t('metrics_modal.m_air_src'),
    businessRule: t('metrics_modal.m_air_biz'),
    validation: t('metrics_modal.m_air_val'),
    statusRule: t('metrics_modal.m_air_stat'),
    example: t('metrics_modal.m_air_ex'),
  },
  {
    id: 'resinConsolidation', name: 'Resin Consolidation', descriptor: t('metrics_modal.m_resin_desc'), unit: 'KUSD', badge: t('metrics_modal.m_resin_badge'), color: '#2563EB',
    formula: t('metrics_modal.m_resin_form'),
    concept: t('metrics_modal.m_resin_conc'),
    source: t('metrics_modal.m_resin_src'),
    businessRule: t('metrics_modal.m_resin_biz'),
    statusRule: t('metrics_modal.m_resin_stat'),
    example: t('metrics_modal.m_resin_ex'),
  },
  {
    id: 'taskCost', name: 'Task Cost Reduction', descriptor: t('metrics_modal.m_task_desc'), unit: 'KBRL', badge: t('metrics_modal.m_task_badge'), color: '#1D4ED8',
    formula: t('metrics_modal.m_task_form'),
    concept: t('metrics_modal.m_task_conc'),
    source: t('metrics_modal.m_task_src'),
    businessRule: t('metrics_modal.m_task_biz'),
    statusRule: t('metrics_modal.m_task_stat'),
    example: t('metrics_modal.m_task_ex'),
  },
  {
    id: 'demurrage', name: 'Demurrage Cost', descriptor: t('metrics_modal.m_demurrage_desc'), unit: 'CTNR', badge: t('metrics_modal.m_demurrage_badge'), color: '#0EA5E9',
    formula: t('metrics_modal.m_demurrage_form'),
    concept: t('metrics_modal.m_demurrage_conc'),
    source: t('metrics_modal.m_demurrage_src'),
    businessRule: t('metrics_modal.m_demurrage_biz'),
    statusRule: t('metrics_modal.m_demurrage_stat'),
    example: t('metrics_modal.m_demurrage_ex'),
  },
  {
    id: 'incidentalCost', name: 'Incidental Cost', descriptor: t('metrics_modal.m_inc_desc'), unit: 'Ratio', badge: t('metrics_modal.m_inc_badge'), color: '#7C3AED',
    formula: t('metrics_modal.m_inc_form'),
    concept: t('metrics_modal.m_inc_conc'),
    source: t('metrics_modal.m_inc_src'),
    businessRule: t('metrics_modal.m_inc_biz'),
    validation: t('metrics_modal.m_inc_val'),
    statusRule: t('metrics_modal.m_inc_stat'),
    example: t('metrics_modal.m_inc_ex'),
  },
];

function DetailBlock({ icon: Icon, label, children, accent = false }) {
  return (
    <section className={`metric-guide__block${accent ? ' metric-guide__block--accent' : ''}`}>
      <div className="metric-guide__block-title"><Icon size={15} />{label}</div>
      <div className="metric-guide__block-content">{children}</div>
    </section>
  );
}

function StatusRule({ metric, t }) {
  if (metric.id === 'resinConsolidation' || metric.id === 'incidentalCost') {
    return <span className="metric-status-rule metric-status-rule--neutral"><span className="metric-status-dot metric-status-dot--neutral" />{metric.statusRule}</span>;
  }

  if (metric.id === 'demurrage') {
    return (
      <div className="metric-status-list">
        <span className="metric-status-rule"><span className="metric-status-dot metric-status-dot--green" /><strong>{t('metrics_modal.status_green')}</strong> {t('metrics_modal.zero_ctnr')}</span>
        <span className="metric-status-rule"><span className="metric-status-dot metric-status-dot--red" /><strong>{t('metrics_modal.status_red')}</strong> {t('metrics_modal.more_zero_ctnr')}</span>
      </div>
    );
  }

  return (
    <div className="metric-status-list">
      <span className="metric-status-rule"><span className="metric-status-dot metric-status-dot--green" /><strong>{t('metrics_modal.status_green')}</strong> {t('metrics_modal.achieve_100')}</span>
      <span className="metric-status-rule"><span className="metric-status-dot metric-status-dot--yellow" /><strong>{t('metrics_modal.status_yellow')}</strong> {t('metrics_modal.achieve_90_99')}</span>
      <span className="metric-status-rule"><span className="metric-status-dot metric-status-dot--red" /><strong>{t('metrics_modal.status_red')}</strong> {t('metrics_modal.achieve_lt_90')}</span>
    </div>
  );
}

export default function MetricsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const METRICS = useMemo(() => getMetrics(t), [t]);
  const [activeId, setActiveId] = useState(METRICS[0].id);
  if (!isOpen) return null;
  const metric = METRICS.find((item) => item.id === activeId) || METRICS[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content metrics-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} className="modal-title-icon" />
            <div><h3>{t('metrics_modal.title')}</h3><p>{t('metrics_modal.subtitle')}</p></div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label={t('metrics_modal.btn_close')}><X size={18} /></button>
        </div>

        <div className="metrics-modal__body">
          <div className="metrics-intro-card">
            <HelpCircle size={18} />
            <div><strong>{t('metrics_modal.guide_title')}</strong><p>{t('metrics_modal.guide_desc')}</p></div>
          </div>

          <div className="metrics-guide">
            <nav className="metrics-guide__nav" aria-label="Metric list">
              <div className="metrics-guide__nav-label">{t('metrics_modal.avail_metrics')}</div>
              {METRICS.map((item, index) => (
                <button type="button" key={item.id} className={`metrics-guide__nav-item${item.id === metric.id ? ' active' : ''}`} onClick={() => setActiveId(item.id)} style={{ '--metric-color': item.color }}>
                  <span className="metrics-guide__nav-number">{String(index + 1).padStart(2, '0')}</span>
                  <span><strong>{item.name}</strong><small>{item.unit} · {item.descriptor}</small></span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </nav>

            <article className="metric-guide__detail" style={{ '--metric-color': metric.color }}>
              <header className="metric-guide__header">
                <div><span className="metric-guide__eyebrow">{t('metrics_modal.def_title')}</span><h4>{metric.name}</h4><p>{metric.descriptor}</p></div>
                <div className="metric-guide__tags"><span>{metric.unit}</span><span>{metric.badge}</span></div>
              </header>
              <DetailBlock icon={Calculator} label={t('metrics_modal.lbl_formula')} accent><code>{metric.formula}</code></DetailBlock>
              <div className="metric-guide__columns">
                <DetailBlock icon={Layers} label={t('metrics_modal.lbl_concept')}>{metric.concept}</DetailBlock>
                <DetailBlock icon={FileSpreadsheet} label={t('metrics_modal.lbl_origin')}>{metric.source}</DetailBlock>
              </div>
              <DetailBlock icon={CheckCircle2} label={t('metrics_modal.lbl_biz_rule')}>{metric.businessRule}</DetailBlock>
              {metric.validation && <DetailBlock icon={AlertCircle} label={t('metrics_modal.lbl_val')}>{metric.validation}</DetailBlock>}
              <DetailBlock icon={Database} label={t('metrics_modal.lbl_status')}><StatusRule metric={metric} t={t} /></DetailBlock>
              <DetailBlock icon={Lightbulb} label={t('metrics_modal.lbl_example')} accent>{metric.example}</DetailBlock>
            </article>
          </div>
        </div>

        <div className="modal-footer"><button className="btn btn--primary" onClick={onClose}>{t('metrics_modal.btn_close')}</button></div>
      </div>
    </div>
  );
}
