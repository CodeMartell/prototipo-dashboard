import {
  LayoutDashboard,
  DollarSign,
  Plane,
  Package,
  HelpCircle,
  BarChart2,
  AlertTriangle
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral', badge: 'Global' },
  { id: 'logisticCost', icon: DollarSign, label: 'War Room Report', badge: 'KPI %' },
  { id: 'airFreight', icon: Plane, label: 'Air Freight', badge: 'Aéreo' },
  { id: 'logisticsVsProd', icon: Package, label: 'Cost x Product', badge: 'Ratio' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', badge: 'Novo' },
];

export default function Sidebar({ 
  activeItem = 'dashboard', 
  onNavigate, 
  onOpenHelp,
  alertsCount = 0,
  kpisWithAlerts = [],
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">LC</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">Logistics Cost</span>
          <span className="sidebar__brand-sub">LG Electronics · DXI</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">PAINÉIS DISPONÍVEIS</div>
        {NAV_ITEMS.map(({ id, icon: Icon, label, badge }) => {
          const hasAlert = kpisWithAlerts.includes(id);
          const isAnalytics = id === 'analytics';
          
          return (
            <button
              key={id}
              className={`sidebar__item ${activeItem === id ? 'active' : ''} ${hasAlert ? 'sidebar__item--has-alert' : ''}`}
              onClick={() => onNavigate?.(id)}
            >
              <Icon size={16} />
              <span className="sidebar__item-label">{label}</span>
              {hasAlert && (
                <span className="sidebar__item-warning" title="Alerta de inconsistência ou oscilação detectada">
                  <AlertTriangle size={12} className="text-warning" />
                </span>
              )}
              {isAnalytics && alertsCount > 0 ? (
                <span className="sidebar__item-badge sidebar__item-badge--alert">{alertsCount}</span>
              ) : (
                badge && <span className="sidebar__item-badge">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__help-box" onClick={onOpenHelp}>
        <HelpCircle size={16} />
        <div>
          <strong>Origem dos Dados?</strong>
          <span>Entenda todas as métricas</span>
        </div>
      </div>

      <div className="sidebar__footer">
        Plataforma Logística · LG DXI
      </div>
    </aside>
  );
}
