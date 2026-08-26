import { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Bell, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  LogOut,
} from 'lucide-react';

export default function Header({ 
  alerts = [], 
  onNavigate,
  onVerifyAlert,
  onDismissAlert,
  user,
  onLogout,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSubtypeLabel = (subtype) => {
    switch (subtype) {
      case 'missing': return 'Ausente';
      case 'out_of_bounds': return 'Fora do Limite';
      case 'duplicate': return 'Duplicidade';
      case 'conflict': return 'Conflito';
      case 'zscore': return 'Desvio';
      case 'mom_variation': return 'Oscilação';
      default: return subtype;
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <div className="header__title">Logistics Cost Dashboard</div>
        <div className="header__subtitle">Financial Analytics Platform</div>
      </div>

      <div className="header__right">
        {/* Sino de Notificações com Dropdown */}
        <div className="header__notifications" ref={dropdownRef}>
          <button 
            className={`btn btn--icon header__bell-btn ${alerts.length > 0 ? 'has-notifications' : ''}`}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Alertas de Integridade e Oscilações"
          >
            <Bell size={15} />
            {alerts.length > 0 && (
              <span className="header__bell-badge animate-bounce">{alerts.length}</span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="notifications-dropdown animate-fade-in">
              <div className="notifications-dropdown__header">
                <div>
                  <strong>Notificações de Dados ({alerts.length})</strong>
                  <span>Alertas ativos detectados</span>
                </div>
                <button 
                  className="btn-close-dropdown" 
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  <X size={12} />
                </button>
              </div>

              <div className="notifications-dropdown__body">
                {alerts.length === 0 ? (
                  <div className="notifications-empty">
                    <CheckCircle2 size={24} className="text-success" />
                    <span>Nenhuma inconsistência ativa.</span>
                  </div>
                ) : (
                  <div className="notifications-list">
                    {alerts.slice(0, 4).map((alert) => (
                      <div key={alert.id} className={`notification-item severity-${alert.severity}`}>
                        <div className="notification-item__title">
                          <AlertTriangle size={12} className="text-warning" />
                          <span className="kpi-name">{alert.kpiName} ({alert.period})</span>
                          <span className="type-tag">{getSubtypeLabel(alert.subtype)}</span>
                        </div>
                        <p className="notification-item__msg">{alert.message}</p>
                        <div className="notification-item__actions">
                          <button 
                            className="btn-action-text text-success" 
                            onClick={() => {
                              onVerifyAlert?.(alert.id);
                            }}
                          >
                            Verificar
                          </button>
                          <button 
                            className="btn-action-text text-muted" 
                            onClick={() => {
                              onDismissAlert?.(alert.id);
                            }}
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 4 && (
                      <div className="notifications-more">
                        E mais {alerts.length - 4} alerta{alerts.length - 4 > 1 ? 's' : ''}...
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="notifications-dropdown__footer">
                <button 
                  className="btn-dropdown-view-all"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onNavigate?.('analytics');
                  }}
                >
                  Ver todos os detalhes em Analytics
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="header__user">
          <div className="header__avatar">
            {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="header__user-info">
            <span className="header__user-name">{user?.name || user?.email || 'Usuário'}</span>
            <span className="header__user-role">{user?.role || '—'}</span>
          </div>
        </div>

        <div className="header__actions">
          <button className="btn btn--primary">
            <Download size={14} />
            Exportar
          </button>
          <button className="btn btn--icon" onClick={onLogout} title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}