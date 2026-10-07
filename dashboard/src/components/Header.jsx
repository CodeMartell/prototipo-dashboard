import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Download, 
  Bell, 
  AlertTriangle, 
  X, 
  CheckCircle2,
  LogOut,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';

const FONT_SIZES = [
  { key: 'normal', title: 'Normal text size' },
  { key: 'medium', title: 'Medium text size' },
  { key: 'large',  title: 'Large text size'  },
];


const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const langs = [
    { code: 'pt', src: 'https://flagcdn.com/w20/br.png', alt: 'BR' },
    { code: 'en', src: 'https://flagcdn.com/w20/us.png', alt: 'US' },
    { code: 'ko', src: 'https://flagcdn.com/w20/kr.png', alt: 'KR' }
  ];
  
  const currentLang = langs.find(l => l.code === i18n.language) || langs[0];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title={t('header?.language') || 'Language'}
        style={{
          background: 'transparent',
          color: 'inherit',
          border: '1px solid var(--border, rgba(255,255,255,0.2))',
          borderRadius: '4px',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img src={currentLang.src} alt={currentLang.alt} style={{ width: '18px', height: '13px', objectFit: 'cover', borderRadius: '2px' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border, rgba(255,255,255,0.1))',
          borderRadius: '6px',
          padding: '4px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {langs.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setIsOpen(false); }}
              style={{
                background: i18n.language === lang.code ? 'var(--highlight, rgba(124, 58, 237, 0.2))' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.2s',
                minWidth: '50px',
                justifyContent: 'center'
              }}
            >
              <img src={lang.src} alt={lang.alt} style={{ width: '18px', height: '13px', objectFit: 'cover', borderRadius: '2px' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Header({ 
  alerts = [], 
  onNavigate,
  onVerifyAlert,
  onDismissAlert,
  user,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  fontSize = 'normal',
  onFontSizeChange,
  canAccessAnalytics = false,
  pendingCount = 0,
  onOpenExport,
  onMenuToggle
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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
        <button 
          className="btn btn--icon mobile-menu-btn" 
          onClick={onMenuToggle}
          title="Menu"
        >
          <Menu size={20} />
        </button>

        <div className="header__title">{t('header.title')}</div>
        <div className="header__subtitle">{t('header.subtitle')}</div>
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
                  <strong>{t('notifications.title')} ({alerts.length})</strong>
                  <span>{t('notifications.subtitle')}</span>
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
                    <span>{t('notifications.empty')}</span>
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
                            {t('notifications.verify')}
                          </button>
                          <button 
                            className="btn-action-text text-muted" 
                            onClick={() => {
                              onDismissAlert?.(alert.id);
                            }}
                          >
                            {t('notifications.dismiss')}
                          </button>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 4 && (
                      <div className="notifications-more">
                        {t('notifications.more').replace('{count}', alerts.length - 4)}
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
                  {t('notifications.view_all')}
                </button>
              </div>
            </div>
          )}
        </div>}

        {/* Font Size Control */}
        {onFontSizeChange && (
          <div className="font-size-control" aria-label="Text size">
            <span className="font-size-control__label" aria-hidden="true">A</span>
            {FONT_SIZES.map((fs) => (
              <button
                key={fs.key}
                className={`font-size-btn font-size-btn--${fs.key}${fontSize === fs.key ? ' active' : ''}`}
                onClick={() => onFontSizeChange(fs.key)}
                title={fs.title}
                aria-label={fs.title}
                aria-pressed={fontSize === fs.key}
              >
                A
              </button>
            ))}
          </div>
        )}

        <button
          className="btn btn--icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <LanguageSelector />

        {/* Link para a Página de Perfil (/perfil) */}
        <div 
          className="header__user header__user--clickable"
          onClick={() => navigate('/perfil')}
          title="Ver perfil, histórico de atividades e aprovações de planilhas"
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className="header__avatar">
            {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
            {pendingCount > 0 && (
              <span 
                className="header__pending-badge animate-bounce"
                title={`${pendingCount} planilha(s) pendente(s) de aprovação`}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '9999px',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-card, #1e293b)'
                }}
              >
                {pendingCount}
              </span>
            )}
          </div>
          <div className="header__user-info">
            <span className="header__user-name">{user?.name || user?.email || 'User'}</span>
            <span className="header__user-role">{user?.role || '—'}</span>
          </div>
        </div>

        <div className="header__actions">
          <button className="btn btn--primary" onClick={onOpenExport} title="Export">
            <Download size={14} />
            <span className="hide-mobile">{t('header.export')}</span>
          </button>
          <button className="btn btn--icon" onClick={onLogout} title={t('header.logout')}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}