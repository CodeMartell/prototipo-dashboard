import React from 'react';
import { X, Database, HelpCircle, Calculator, CheckCircle2, TrendingDown, Layers } from 'lucide-react';

const METRICS_EXPLANATIONS = [
  {
    id: 'logisticCost',
    title: '1. Custo Logístico Total (Logistic Cost KPI TV %)',
    formula: 'Logistic Cost (%) = (Custo Logístico Total + Incident Costs) / Valor Bruto de Produção',
    source: 'ARUM System (Fretes) + Incident Cost System (Sinistros/Demurrage) + GERP (Produção)',
    badge: 'Quanto Menor, Melhor',
    badgeColor: 'var(--brand-800)',
    concept: 'Percentual do custo total de movimentação logística sobre o valor financeiro da produção bruta de TVs.',
    rationale: 'Permite medir a eficiência do frete relativo ao volume financeiro gerado pela fábrica. Se a produção aumenta, o frete nominal sobe, mas o percentual deve cair ou manter-se estável para demonstrar ganho de escala.',
    example: 'Em Jan/26, gastou-se $2.56M em frete + adicionais para $47.63M de produção = 5.38% (frente a uma meta de 6.48%).'
  },
  {
    id: 'airFreight',
    title: '2. Custo Médio — Air Freight (Air Freight KPI TV %)',
    formula: 'Air Freight (%) = Custo de Frete Aéreo Emergencial / Valor Bruto de Produção',
    source: 'ARUM System (Ordens de Transporte Aéreo Emergencial) + GERP',
    badge: 'Monitoramento de Crise',
    badgeColor: 'var(--accent-teal)',
    concept: 'Proporção do custo de fretes aéreos emergenciais não planejados em relação ao total produzido.',
    rationale: 'Fretes aéreos custam de 4x a 8x mais que o modal marítimo. Acompanhar este indicador isoladamente identifica gargalos críticos na cadeia de suprimentos e atrasos de fornecedores que exigem transporte de urgência.',
    example: 'Em Mar/26, o indicador atingiu 0.74% (meta era 0.22%), alertando sobre o estouro por frete emergencial de peças essenciais.'
  },
  {
    id: 'logisticsVsProd',
    title: '3. Custo por Valor de Produção (Cost x Product Amount Ratio)',
    formula: 'Ratio = Custo Logístico Nominal (MUSD) / Valor de Produção Nominal (MUSD)',
    source: 'Planilha Master (dados.xlsx — Aba 3) consolidando GERP e Financeiro',
    badge: 'Ratio Financeiro Direto',
    badgeColor: 'var(--accent-violet)',
    concept: 'Relação pura sem ponderação contratual entre a despesa de transporte em dólares e o valor produzido em dólares.',
    rationale: 'Fornece visibilidade transparente da variação estrutural dos custos logísticos em relação ao volume nominal fabricado, sem contaminação de metas variáveis.',
    example: 'Em Mai/26: $2.70M USD de custo / $57.15M USD de produção = 0.0472 (ou 4.72%).'
  },
  {
    id: 'totalProd',
    title: '4. Valor Total de Produção (Production Amount — MUSD)',
    formula: 'Valor Total = Soma dos valores nominais (MUSD) reportados pelo GERP',
    source: 'GERP (LG ERP Proprietário — Módulo de Faturamento e Produção)',
    badge: 'Denominador Orçamentário',
    badgeColor: 'var(--accent-amber)',
    concept: 'Montante financeiro bruto equivalente às unidades de TV fabricadas no período.',
    rationale: 'É a base orçamentária da planta. Permite entender se oscilações no custo total foram causadas por variação no volume produtivo ou por aumento de tarifas de frete.',
    example: 'No acumulado de Y26 (Jan-Mai), a fábrica produziu $277.94 MUSD em eletrônicos.'
  },
  {
    id: 'accumulatedCost',
    title: '5. Custo Logístico Acumulado (Logistics Cost — MUSD)',
    formula: 'Custo Acumulado = Soma dos desembolsos mensais em transporte (MUSD)',
    source: 'ARUM System + Relatórios de Tesouraria/Financeiro',
    badge: 'Volume Financeiro Bruto',
    badgeColor: 'var(--brand-800)',
    concept: 'Total em dólares efetivamente desembolsado pela LG para transporte e armazenagem.',
    rationale: 'Indispensável para o controle de caixa e negociação de contratos volumétricos com armadores e transportadoras.',
    example: 'No acumulado de Y26 (Jan-Mai), o desembolso total de frete somou $12.23 MUSD.'
  },
  {
    id: 'achievement',
    title: '6. Percentual de Atingimento (Achievement Ratio)',
    formula: 'Achievement = Target (%) / Result (%)',
    source: 'Cálculo analítico do Dashboard comparando Planejado vs Realizado',
    badge: 'KPI de Performance',
    badgeColor: 'var(--accent-green)',
    concept: 'Índice de cumprimento da meta estipulada para custos (onde menor custo é melhor).',
    rationale: 'Como a meta é um limite máximo de gasto, se o resultado for menor que a meta, a divisão Target / Result será maior que 1.0 (100%), indicando economia orçamentária.',
    example: 'Target de 6.48% / Resultado de 5.38% = 1.205 (120.5% de atingimento da meta — economia de 1.1% no custo total).'
  }
];

export default function MetricsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} className="modal-title-icon" />
            <div>
              <h3>Guia de Métricas & Origem dos Dados</h3>
              <p>Racional lógico, fórmulas e sistemas corporativos de origem para defesa em reuniões</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="metrics-intro-card">
            <HelpCircle size={18} style={{ color: 'var(--brand-800)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Como explicar esses números para a Gestão:</strong>
              <p>
                Todos os indicadores de custo adotam a premissa de <em>"Quanto Menor, Melhor"</em>. 
                Os dados financeiros são consolidados a partir do <strong>GERP (ERP da LG)</strong> para volumes de produção 
                e do <strong>ARUM System / Incident Cost System</strong> para despesas de transporte e contingências logísticas.
              </p>
            </div>
          </div>

          <div className="metrics-grid">
            {METRICS_EXPLANATIONS.map((item) => (
              <div key={item.id} className="metric-card-detail">
                <div className="metric-card-detail__header">
                  <h4>{item.title}</h4>
                  <span className="metric-badge" style={{ backgroundColor: item.badgeColor + '22', color: item.badgeColor, borderColor: item.badgeColor + '44' }}>
                    {item.badge}
                  </span>
                </div>

                <div className="metric-card-detail__formula">
                  <Calculator size={14} />
                  <code>{item.formula}</code>
                </div>

                <div className="metric-card-detail__row">
                  <strong><Layers size={13} /> Conceito:</strong> {item.concept}
                </div>

                <div className="metric-card-detail__row">
                  <strong><Database size={13} /> Origem dos Dados:</strong> {item.source}
                </div>

                <div className="metric-card-detail__row">
                  <strong><CheckCircle2 size={13} /> Racional de Negócio:</strong> {item.rationale}
                </div>

                <div className="metric-card-detail__example">
                  <strong>Exemplo Prático:</strong> {item.example}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn--primary" onClick={onClose}>
            Entendido, fechar guia
          </button>
        </div>
      </div>
    </div>
  );
}