import { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Bell, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';

export default function Header({ 
  alerts = [], 
  onNavigate,
  onVerifyAlert,
  onDismissAlert,
  user,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  canAccessAnalytics = false,
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
      case 'missing': return 'Missing';
      case 'out_of_bounds': return 'Out of Bounds';
      case 'duplicate': return 'Duplicate';
      case 'conflict': return 'Conflict';
      case 'zscore': return 'Deviation';
      case 'mom_variation': return 'Fluctuation';
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
        {/* Notifications Bell with Dropdown */}
        {canAccessAnalytics && <div className="header__notifications" ref={dropdownRef}>
          <button 
            className={`btn btn--icon header__bell-btn ${alerts.length > 0 ? 'has-notifications' : ''}`}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            title="Integrity & Fluctuation Alerts"
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
                  <strong>Data Notifications ({alerts.length})</strong>
                  <span>Active alerts detected</span>
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
                    <span>No active inconsistencies found.</span>
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
                            Verify
                          </button>
                          <button 
                            className="btn-action-text text-muted" 
                            onClick={() => {
                              onDismissAlert?.(alert.id);
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 4 && (
                      <div className="notifications-more">
                        And {alerts.length - 4} more alert{alerts.length - 4 > 1 ? 's' : ''}...
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
                  View all details in Analytics
                </button>
              </div>
            </div>
          )}
        </div>}

        {/* Theme Toggle Button */}
        <button
          className="btn btn--icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="header__user">
          <div className="header__avatar">
            {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="header__user-info">
            <span className="header__user-name">{user?.name || user?.email || 'User'}</span>
            <span className="header__user-role">{user?.role || '—'}</span>
          </div>
        </div>

        <div className="header__actions">
          <button className="btn btn--primary">
            <Download size={14} />
            Export
          </button>
          <button className="btn btn--icon" onClick={onLogout} title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}