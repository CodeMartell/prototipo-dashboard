import {
  LayoutDashboard,
  DollarSign,
  Plane,
  Package,
  HelpCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral', badge: 'Global' },
  { id: 'logisticCost', icon: DollarSign, label: 'War Room Report', badge: 'KPI %' },
  { id: 'airFreight', icon: Plane, label: 'Air Freight', badge: 'Aéreo' },
  { id: 'logisticsVsProd', icon: Package, label: 'Cost x Product', badge: 'Ratio' },
];

export default function Sidebar({ activeItem = 'dashboard', onNavigate, onOpenHelp }) {
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
        {NAV_ITEMS.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            className={`sidebar__item ${activeItem === id ? 'active' : ''}`}
            onClick={() => onNavigate?.(id)}
          >
            <Icon size={16} />
            <span className="sidebar__item-label">{label}</span>
            {badge && <span className="sidebar__item-badge">{badge}</span>}
          </button>
        ))}
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
