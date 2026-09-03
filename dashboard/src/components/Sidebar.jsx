import {
  LayoutDashboard,
  DollarSign,
  Plane,
  Package,
  HelpCircle,
  BarChart2,
  AlertTriangle,
  TrendingDown,
  Anchor,
  Layers,
  Lock
} from 'lucide-react';

// Os badges acompanham a unidade real de cada indicador no banco.
const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Overview', badge: 'Global' },
  { id: 'logisticCost', icon: DollarSign, label: 'War Room Report', badge: '%' },
  { id: 'totalCost', icon: TrendingDown, label: 'Task Cost Reduction', badge: 'KBRL' },
  { id: 'airFreight', icon: Plane, label: 'Air Freight', badge: '%' },
  { id: 'demurrage', icon: Anchor, label: 'Demurrage Cost', badge: 'CTNR' },
  { id: 'logisticsVsProd', icon: Package, label: 'Incidental Cost', badge: 'Ratio' },
  { id: 'incidentialCost', icon: Layers, label: 'Resin Consolidation', badge: 'KUSD' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', badge: 'New' },
];

export default function Sidebar({ 
  activeItem = 'dashboard', 
  onNavigate, 
  onOpenHelp,
  alertsCount = 0,
  kpisWithAlerts = [],
  canAccessAnalytics = false,
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
        <div className="sidebar__section-label">AVAILABLE DASHBOARDS</div>
        {NAV_ITEMS.map(({ id, icon: Icon, label, badge }) => {
          const hasAlert = kpisWithAlerts.includes(id);
          const isAnalytics = id === 'analytics';
          // Analytics segue visivel mas bloqueado enquanto a feature nao for liberada.
          const isLocked = isAnalytics && !canAccessAnalytics;

          return (
            <button
              key={id}
              type="button"
              disabled={isLocked}
              aria-disabled={isLocked}
              title={isLocked ? 'Analytics — coming soon' : undefined}
              className={`sidebar__item ${activeItem === id ? 'active' : ''} ${hasAlert ? 'sidebar__item--has-alert' : ''} ${isLocked ? 'sidebar__item--locked' : ''}`}
              onClick={() => {
                if (isLocked) return;
                onNavigate?.(id);
              }}
            >
              {isLocked ? <Lock size={16} /> : <Icon size={16} />}
              <span className="sidebar__item-label">{label}</span>
              {hasAlert && (
                <span className="sidebar__item-warning" title="Inconsistency or fluctuation alert detected">
                  <AlertTriangle size={12} className="text-warning" />
                </span>
              )}
              {isLocked ? (
                <span className="sidebar__item-badge sidebar__item-badge--soon">Soon</span>
              ) : isAnalytics && alertsCount > 0 ? (
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
          <strong>Data Origin?</strong>
          <span>Understand all metrics</span>
        </div>
      </div>

      <div className="sidebar__footer">
        Logistics Platform · LG DXI
      </div>
    </aside>
  );
}
