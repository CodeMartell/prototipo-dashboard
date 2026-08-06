import { RefreshCw, Download, HelpCircle } from 'lucide-react';

export default function Header({ onOpenHelp }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="header">
      <div className="header__left">
        <div className="header__title">Logistics Cost Dashboard</div>
        <div className="header__subtitle">Financial Analytics Platform</div>
      </div>

      <div className="header__right">
        <div className="header__meta">
          Última atualização<br />
          <strong>{dateStr} — {timeStr}</strong>
        </div>

        <div className="header__user">
          <div className="header__avatar">LG</div>
          <div className="header__user-info">
            <span className="header__user-name">Logística & Admin</span>
            <span className="header__user-role">LG Electronics · DXI</span>
          </div>
        </div>

        <div className="header__actions">
          <button className="btn btn--accent" onClick={onOpenHelp} title="Entenda a origem de todos os dados e fórmulas">
            <HelpCircle size={14} />
            Origem dos Dados
          </button>
          <button className="btn">
            <RefreshCw size={14} />
            Atualizar
          </button>
          <button className="btn btn--primary">
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>
    </header>
  );
}
