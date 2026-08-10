import React from 'react';
import { Calendar, Eye, ArrowLeftRight } from 'lucide-react';

export default function ActivePeriodBanner({
  periodType,
  selectedSubPeriod,
  selectedYear,
  comparisonMode,
}) {
  const yearLabel = `20${selectedYear.substring(1)}`;
  const prevYearLabel = `20${parseInt(selectedYear.substring(1)) - 1}`;

  const periodNames = {
    monthly: {
      Jan: 'Janeiro', Feb: 'Fevereiro', Mar: 'Março', Apr: 'Abril',
      May: 'Maio', Jun: 'Junho', Jul: 'Julho', Aug: 'Agosto',
      Sep: 'Setembro', Oct: 'Outubro', Nov: 'Novembro', Dec: 'Dezembro'
    },
    quarterly: {
      Q1: '1º Trimestre (Q1)', Q2: '2º Trimestre (Q2)',
      Q3: '3º Trimestre (Q3)', Q4: '4º Trimestre (Q4)'
    },
    semiannual: {
      H1: '1º Semestre (Jan-Jun)', H2: '2º Semestre (Jul-Dez)'
    },
    annual: {
      Y26: 'Ano Completo 2026', Y25: 'Ano Completo 2025'
    }
  };

  const getSubPeriodTitle = () => {
    if (periodType === 'monthly') return `${periodNames.monthly[selectedSubPeriod] || selectedSubPeriod} de ${yearLabel}`;
    if (periodType === 'quarterly') return `${periodNames.quarterly[selectedSubPeriod] || selectedSubPeriod} - ${yearLabel}`;
    if (periodType === 'semiannual') return `${periodNames.semiannual[selectedSubPeriod] || selectedSubPeriod} - ${yearLabel}`;
    return `Ano Fiscal de ${yearLabel}`;
  };

  const getComparisonText = () => {
    if (comparisonMode === 'target') return `Comparando com: Meta (Target) Oficial ${yearLabel}`;
    if (comparisonMode === 'ytd') return `Comparando com: Acumulado YTD (${yearLabel} vs ${prevYearLabel})`;
    return `Comparando com: Mesmo período em ${prevYearLabel} (YoY)`;
  };

  return (
    <div className="active-period-banner animate-fade-in">
      <div className="active-period-banner__primary">
        <div className="active-period-banner__icon">
          <Eye size={18} />
        </div>
        <div className="active-period-banner__info">
          <span className="active-period-banner__tag">
            <Calendar size={12} />
            Período em Verificação Ativa
          </span>
          <h2 className="active-period-banner__title">{getSubPeriodTitle()}</h2>
        </div>
      </div>

      <div className="active-period-banner__meta">
        <div className="active-period-banner__badge">
          <ArrowLeftRight size={13} />
          <span>{getComparisonText()}</span>
        </div>
        <div className="active-period-banner__granularity">
          Granularidade: <strong>{periodType === 'monthly' ? 'Mensal' : periodType === 'quarterly' ? 'Trimestral' : periodType === 'semiannual' ? 'Semestral' : 'Anual'}</strong>
        </div>
      </div>
    </div>
  );
}
