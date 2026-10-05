import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Lock,
  Users,
  Shield,
  X
} from 'lucide-react';
import { getCurrentUser } from '../services/api';
import { canReadUsers, canReadAuditLog } from '../services/permissions';

// Os badges acompanham a unidade real de cada indicador no banco.
const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, badge: 'Global' },
  { id: 'logisticCost', icon: DollarSign, badge: '%' },
  { id: 'totalCost', icon: TrendingDown, badge: 'KBRL' },
  { id: 'airFreight', icon: Plane, badge: '%' },
  { id: 'demurrage', icon: Anchor, badge: 'CTNR' },
  { id: 'logisticsVsProd', icon: Package, badge: 'Ratio' },
  { id: 'incidentialCost', icon: Layers, badge: 'KUSD' },
  { id: 'analytics', icon: BarChart2, badge: 'New' },
];

export default function Sidebar({
  isOpen = false,
  onClose, 
  activeItem = 'dashboard', 
  onNavigate, 
  onOpenHelp,
  alertsCount = 0,
  kpisWithAlerts = [],
  canAccessAnalytics = false,
}) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { t } = useTranslation();
  const showUsersLink = canReadUsers(user);
  const showAuditLink = canReadAuditLog(user);

  return (
    
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">LC</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">{t('sidebar.brand')}</span>
          <span className="sidebar__brand-sub">{t('sidebar.sub')}</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__section-label">{t('sidebar.available_dashboards')}</div>
        {NAV_ITEMS.map(({ id, icon: Icon, badge }) => {
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
              <span className="sidebar__item-label">{t(`nav.${id}`)}</span>
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

        {(showUsersLink || showAuditLink) && (
          <>
            <div className="sidebar__section-label" style={{ marginTop: '1.25rem' }}>
              {t('sidebar.governance')}
            </div>

            {showUsersLink && (
              <button
                type="button"
                className="sidebar__item"
                onClick={() => navigate('/usuarios')}
                title="Gestão de Usuários e Permissões"
              >
                <Users size={16} />
                <span className="sidebar__item-label">{t('sidebar.users')}</span>
              </button>
            )}

            {showAuditLink && (
              <button
                type="button"
                className="sidebar__item"
                onClick={() => navigate('/auditoria')}
                title="Trilha de Auditoria (Audit Log)"
              >
                <Shield size={16} />
                <span className="sidebar__item-label">{t('sidebar.audit')}</span>
              </button>
            )}
          </>
        )}
      </nav>

      <div className="sidebar__help-box" onClick={onOpenHelp}>
        <HelpCircle size={16} />
        <div>
          <strong>{t('sidebar.help_title')}</strong>
          <span>{t('sidebar.help_sub')}</span>
        </div>
      </div>

      <div className="sidebar__footer">
        {t('sidebar.footer')}
      </div>
    </aside>
    </>
  );
}

