import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  Layers,
  Building2,
  FileText,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'comparativo', icon: GitCompare, label: 'Comparativo' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'custos-categoria', icon: Layers, label: 'Custos por Categoria' },
  { id: 'custos-unidade', icon: Building2, label: 'Custos por Unidade' },
  { id: 'relatorios', icon: FileText, label: 'Relatórios' },
  { id: 'configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar({ activeItem = 'dashboard', onNavigate }) {
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
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`sidebar__item ${activeItem === id ? 'active' : ''}`}
            onClick={() => onNavigate?.(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        Ambiente corporativo · MVP
      </div>
    </aside>
  );
}
