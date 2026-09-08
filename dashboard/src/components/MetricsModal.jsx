import React from 'react';
import { X, Database, HelpCircle, Calculator, CheckCircle2, Layers, AlertCircle } from 'lucide-react';

const METRICS_EXPLANATIONS = [
  {
    id: 'warRoom',
    title: '1. War Room Report (Logistic Cost KPI TV %)',
    formula: 'Logistic Cost (%) = Total Logistics Cost / Gross Production Value',
    source: 'Relatório War Room (aba "Logistic", linha 67) / E-mail semanal',
    badge: 'Lower is Better',
    badgeColor: 'var(--brand-800)',
    concept: 'Percentual do custo total de movimentação logística em relação ao faturamento bruto de produção de TVs.',
    rationale: 'Mede a eficiência logística em relação ao volume financeiro fabril. Se a produção sobe, o frete nominal aumenta, mas a taxa percentual deve cair ou se manter estável por ganho de escala.',
    semaphore: '🟢 Verde: >= 100% | 🟡 Amarelo: 90% a 99% | 🔴 Vermelho: < 90%',
    example: 'Em Jan/26, gasto logístico de 5,4% contra meta de 6,5% = 120% de atingimento (Verde).'
  },
  {
    id: 'airFreight',
    title: '2. Air Freight (%) — Frete Aéreo Emergencial',
    formula: 'Mensal: Freight Amount (linha 9) / Material Cost (linha 8)\nACC Anual: SOMA(Freight, 12 meses) / SOMA(Material, 12 meses)',
    source: 'Relatório 260606_ Freight Air (Monthly).xlsb (aba "Annual Result") / E-mail mensal (Slide 3) + fallback manual',
    badge: 'Crisis Monitoring',
    badgeColor: 'var(--accent-teal)',
    concept: 'Proporção dos custos de frete aéreo não planejado (emergencial) em relação ao custo total de materiais (TV).',
    rationale: 'O frete aéreo custa de 4x a 8x mais que o marítimo. Acompanha gargalos críticos de fornecimento e atrasos de componentes que exigem transporte urgente. Target só existe para 2026 (fixo anual, cadastrado na coluna 42); 2024 e 2025 possuem histórico mensal sem meta.',
    semaphore: '🟢 Verde: >= 100% | 🟡 Amarelo: 90% a 99% | 🔴 Vermelho: < 90%',
    accValidation: 'O ACC anual calculado é validado automaticamente contra as colunas pré-existentes na planilha (coluna P para 2024, coluna AC para 2025). Divergências disparam alerta de auditoria.',
    example: 'Em Jul/26: Freight Amount / Material Cost = 0,358% (Target 0,22%). Atingimento = 61,36% (Vermelho).'
  },
  {
    id: 'resinConsolidation',
    title: '3. Resin Consolidation (KUSD) — Otimização de Resina',
    formula: 'Saving Líquido = Saving Bruto (CTN 20 Fts) - Custos Globais - Impostos BR (34,39%)',
    source: 'Relatório Incidental Cost (aba "Resin Consolidation") / E-mail mensal',
    badge: 'Saving / Ganho',
    badgeColor: '#2563EB',
    concept: 'Economia financeira líquida obtida pela consolidação de resina plástica em contêineres de 40 pés vs 20 pés.',
    rationale: 'Todo saving positivo representa ganho direto de produtividade para a operação. Não há target de teto; a agregação anual/trimestral é por SOMA acumulada.',
    semaphore: '🟢 Sempre Verde: qualquer valor de saving apurado é positivo por definição.',
    example: 'Em Jun/26, saving líquido de $3,34 KUSD alcançado na operação Manaus.'
  },
  {
    id: 'taskCost',
    title: '4. Task Cost Reduction (KBRL) — Redução de Custos Operacionais',
    formula: 'Redução Alcançada = Custos Orçados - Custos Realizados (KBRL)',
    source: 'Planilha de Task Cost Reduction / Relatório mensal de controladoria',
    badge: 'Saving / Redução',
    badgeColor: '#1D4ED8',
    concept: 'Redução nominal de custos de tarefas e processos logísticos executados pela equipe.',
    rationale: 'Mede os projetos de redução contínua de custos operacionais (Kaizen/Six Sigma). A agregação anual, semestral e trimestral é realizada por SOMA acumulada.',
    semaphore: '🟢 Sempre Verde: reduções alcançadas representam economia comprovada.',
    example: 'Em Jun/26, redução acumulada de 688 KBRL realizada contra meta de 641 KBRL.'
  },
  {
    id: 'demurrage',
    title: '5. Demurrage Cost (CTNR) — Sobrestadia de Contêineres',
    formula: 'Demurrage = Quantidade de contêineres retidos além do free-time (CTNR)',
    source: 'Relatório Demurrage Cost / Controle de devolução de vazios dos armadores',
    badge: 'Target Zero',
    badgeColor: '#0EA5E9',
    concept: 'Total de contêineres com cobrança de diárias extras por atraso na desova e devolução.',
    rationale: 'A meta de demurrage é estritamente ZERO contêineres. Qualquer valor acima de zero indica perda financeira e ineficiência de pátio/porto.',
    semaphore: '🟢 Verde: 0 contêineres (meta atingida) | 🔴 Vermelho: > 0 contêineres (qualquer ocorrência)',
    example: 'Em Y25, foram registrados 5 contêineres em sobrestadia (Vermelho, $925 USD de custo).'
  },
  {
    id: 'logisticsVsProd',
    title: '6. Incidental Cost (Ratio) — Custo Logístico vs Produção',
    formula: 'Ratio = Nominal Logistics Cost (MUSD) / Nominal Production Value (MUSD)',
    source: 'Master Sheet (dados.xlsx — Tab 3) consolidando GERP e Financeiro',
    badge: 'Direct Ratio',
    badgeColor: '#7C3AED',
    concept: 'Relação pura e não ponderada entre despesa logística (MUSD) e valor produzido (MUSD).',
    rationale: 'Fornece visibilidade transparente da variação estrutural do custo logístico sem distorções de metas variáveis. A agregação é a soma dos custos dividida pela soma da produção.',
    semaphore: '⚪ Sem Semáforo: indicador analítico de proporção direta sem semáforo associado.',
    example: 'Em Jun/26: $2,64M USD custo / $49,27M USD produção = Ratio 0,0536 (5,36%).'
  }
];

export default function MetricsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Database size={20} className="modal-title-icon" />
            <div>
              <h3>Metrics Guide & Data Origin</h3>
              <p>Racional lógico, fórmulas de cálculo, origens oficiais e regras de semáforo dos 6 indicadores</p>
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
              <strong>Auditoria e Origem dos Dados (Data Origin):</strong>
              <p>
                Os 6 indicadores são alimentados automaticamente por robôs RPA que monitoram planilhas e e-mails operacionais (ARUM, GERP, relatórios de War Room e relatórios mensais de Frete Aéreo).
                Para indicadores de custo com meta percentual (War Room e Air Freight), o atingimento reflete o cumprimento do teto orçamentário.
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
                  <code style={{ whiteSpace: 'pre-line' }}>{item.formula}</code>
                </div>

                <div className="metric-card-detail__row">
                  <strong><Layers size={13} /> Conceito:</strong> {item.concept}
                </div>

                <div className="metric-card-detail__row">
                  <strong><Database size={13} /> Origem (Data Origin):</strong> {item.source}
                </div>

                <div className="metric-card-detail__row">
                  <strong><CheckCircle2 size={13} /> Racional de Negócio:</strong> {item.rationale}
                </div>

                {item.accValidation && (
                  <div className="metric-card-detail__row" style={{ color: 'var(--accent-amber, #d97706)' }}>
                    <strong><AlertCircle size={13} /> Validação ACC:</strong> {item.accValidation}
                  </div>
                )}

                <div className="metric-card-detail__row" style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px' }}>
                  <strong>Regra de Semáforo:</strong>&nbsp;{item.semaphore}
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