# Dashboard KPI Logístico — War Room Report
**Protótipo de dashboard para consolidação e visualização de indicadores logísticos**

[React] [Vite] [Recharts]

## Visão Geral
Este projeto consolida seis KPIs atualmente acompanhados de forma manual, possibilitando a comparação de períodos (Year-over-Year) e apoiando a tomada de decisões por meio de planos de ação e evidências.

## Indicadores (KPIs)
| Indicador | Descrição | Target | Objetivo |
|---|---|---|---|
| **Logistic Cost KPI TV (War Room Report)** | Custo logístico como percentual | Variável por mês | Menor é melhor |
| **Air Freight KPI TV** | Custo de frete aéreo como percentual | 0.40% (2025), 0.22% (2026) | Menor é melhor |
| **Resin Consolidation** | Saving da consolidação de resina | Variável por mês | Maior é melhor |
| **Task Cost Reduction** | Redução de custo da operação interna | Variável por mês | Maior é melhor |
| **Demurrage Cost** | Contêineres com sobrestadia | 0 | Menor é melhor |
| **Logistics Cost x Product Amount** | Relação custo logístico / volume de produção em MUSD | Sem target definido | Menor é melhor |

## Funcionalidades
- [x] Comparação ano a ano (2025 vs 2026)
- [x] Filtro de período (Mensal / Trimestral / Semestral / Anual)
- [x] Target vs. Realizado com % de atingimento
- [x] Destaque automático de melhores e piores períodos
- [x] Detecção de anomalias (desvio > 2σ)
- [x] Plano de ação por indicador
- [x] Área de evidências (upload simulado)
- [x] Sidebar de navegação
- [x] Design responsivo (desktop, tablet, mobile)

## Tecnologias
- React 19
- Vite 8
- Recharts (gráficos compostos)
- Lucide React (ícones)
- Vanilla CSS (design system customizado)

## Como Executar
```bash
# Clonar o repositório
git clone https://github.com/SEU_USUARIO/prototipo-dashboard.git
cd prototipo-dashboard/dashboard

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
Acesse http://localhost:5173

## Estrutura do Projeto
```
dashboard/     # interface React
server/        # API FastAPI e banco
rpa_email/     # IMAP, extração dos seis indicadores e envio à API
```

## Dados
O dashboard lê os dados da API. O pacote `rpa_email` processa os relatórios recebidos, extrai os KPIs e envia um payload validado ao backend.

## Próximos Passos
- Integração com dados reais (API / Power BI)
- Autenticação de usuários
- Persistência de planos de ação e evidências
- Exportação de relatórios em PDF
- Notificações de anomalias

## Testes e homologação

Consulte [o plano do Épico 7](docs/epico-7-homologacao.md) para executar os testes, verificar a cobertura e conduzir o aceite com usuários e a validação de produção.

Para testar a ingestão local de três e-mails até o dashboard, consulte [o roteiro do fluxo local](docs/fluxo-local-tres-emails.md).

## Licença

MIT
