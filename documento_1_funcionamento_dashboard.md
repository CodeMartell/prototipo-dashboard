# Documentação de Funcionamento do Dashboard Logístico — LG Electronics (DXI)

**Aplicação:** Plataforma de Analytics e Consolidação de Indicadores Logísticos  
**Escopo:** Área de Logística e Administrativo (DXI)  
**Status do Documento:** Especificação Operacional v1.0  
**Data:** 06 de Agosto de 2026  

---

## 1. Visão Geral e Propósito da Aplicação

A **Plataforma de Analytics Logístico** é a aplicação web central para monitoramento, análise e acompanhamento de planos de ação referentes aos custos operacionais de transporte e produção da **LG Electronics (DXI)**.

A aplicação unifica o acompanhamento de 3 painéis/indicadores vitais:

1. **War Room Report (Logistic Cost KPI TV):** Painel executivo principal para análise do custo logístico total como proporção do valor bruto de produção.
2. **Air Freight KPI TV:** Painel dedicado ao monitoramento estrito de fretes aéreos emergenciais, garantindo alerta precoce sobre aumentos atípicos de frete não planejado.
3. **Logistic Cost x Product Amount:** Painel de correlação financeira entre os valores nominais de custos logísticos (MUSD) e os volumes de produção (MUSD).

---

## 2. Mapeamento de Fontes de Dados e Pipeline de Ingestão

Os dados apresentados na aplicação derivam da consolidação automatizada das seguintes origens corporativas:

- **GERP (LG ERP Proprietário):** Base oficial dos valores de produção acumulada por mês e registros fiscais.
- **ARUM System:** Sistema de gestão de ordens de transporte e movimentação de fretes marítimos e rodoviários.
- **Incident Cost System:** Registro corporativo de despesas não planejadas ou sinistros logísticos (sobreestadia/demurrage, avarias, armazenagem extra).
- **Relatórios Financeiros via E-mail:** Relatórios semanais e mensais transmitidos pela equipe financeira.
- **Planilha Master (`dados.xlsx`):** Base consolidada de referência para homologação dos indicadores temporais.

---

## 3. Regras de Negócio e Fórmulas dos Indicadores (KPIs)

Todos os indicadores de custo adotam a premissa de **"Quanto Menor, Melhor"**, onde variações percentuais negativas em relação ao ano anterior indicam ganho de eficiência operacional.

### 3.1 Fórmulas Matemáticas

#### A. Logistic Cost KPI TV (%)
$$\text{Logistic Cost (\%)} = \frac{\text{Custo Logístico Total (MUSD)} + \text{Incident Cost (MUSD)}}{\text{Volume de Produção (MUSD)}}$$

#### B. Air Freight KPI TV (%)
$$\text{Air Freight (\%)} = \frac{\text{Custo de Frete Aéreo (MUSD)}}{\text{Volume de Produção (MUSD)}}$$

#### C. Logistic Cost x Product Amount Ratio
$$\text{Ratio} = \frac{\text{Custo Logístico Total (MUSD)}}{\text{Volume de Produção (MUSD)}}$$

#### D. Percentual de Atingimento da Meta (Achievement Ratio)
$$\text{Achievement} = \frac{\text{Target (\%)}}{\text{Result (\%)}}$$
*(Nota: Valores $\ge 1.00$ ou $\ge 100\%$ indicam que o resultado ficou dentro ou abaixo da meta estipulada).*

#### E. Variação Ano a Ano (YoY — Year over Year %)
$$\text{Variação YoY (\%)} = \left( \frac{\text{Resultado (Período Atual 2026)}}{\text{Resultado (Mesmo Período 2025)}} - 1 \right) \times 100$$

---

## 4. Guia de Interpretação dos Gráficos e Funcionalidades

### 4.1 Gráficos Compostos (Comparison Charts)
Cada seção de KPI apresenta um gráfico de combinação de barras e linhas:
- **Barras Verticais (Azul/Teal/Roxo):** Representam o resultado realizado no ano atual (**2026**).
- **Linha Tracejada Roxa com Pontos:** Representa a série histórica do ano anterior (**2025**).
- **Linha Tracejada Verde:** Representa a linha de meta (**Target**).
- **Destaque Amarelo/Vermelho:** Barras em **amarelo** sinalizam o melhor período do ano; barras em **vermelho** sinalizam o pior período.

### 4.2 Detecção de Anomalias e Variabilidade
- O sistema calcula automaticamente o desvio padrão da série ($\sigma$). Meses com variação acima de $2\sigma$ são destacados com ícones de alerta para investigação urgente.

### 4.3 Planos de Ação e Evidências Vinculadas
- Cada KPI conta com um painel retrátil para registro de **Planos de Ação**, permitindo descrever a causa raiz de aumentos de custos e simular o envio de arquivos de **Evidências** (ex.: faturas de frete, autorizações de emergência).

---

## 5. Matriz de Status: Implementado vs. Planejado

| Componente / Recurso | Status Atual | Observação de Projeto |
|---|---|---|
| Visuais de Comparação YoY | **Implementado** | Renderização com Recharts (Mensal e Trimestral) |
| Filtro Dinâmico de Período | **Implementado** | Alternância em tempo real (Mensal / Trimestral) |
| Detecção de Anomalias (>2σ) | **Implementado** | Destacado nas tabelas detalhadas |
| Registro de Planos de Ação | **Implementado** | Interface com estado local reativo |
| Ingestão Automática via RPA | **Planejado** | Integração direta dos scripts Python no pipeline |
| Persistência em Banco de Dados | **Planejado** | Substituição do arquivo local pelo Data Store central |

---

## 6. Ponto Crítico 1 — Ajuste de Layout: Correção de Legendas Cortadas

### 6.1 Descrição da Anomalia Visual Identificada
Nos gráficos de indicadores (`War Room Report`, `Air Freight` e `Logistic Cost x Product Amount`), a legenda inferior contendo os rótulos **"2026 (Realizado)"**, **"2025 (Ano Anterior)"** e **"Target"** apresentava corte vertical de margem, ficando parcialmente invisível abaixo da área útil do visual.

### 6.2 Causa Técnica e Solução de Layout Aplicada
- **Causa:** O container do gráfico possuía altura fixa que era 100% ocupada pela área do SVG do Recharts, empurrando o componente flex de legenda para fora do fluxo.
- **Solução:** Reestruturação da estrutura container com layout Flexbox vertical, estabelecendo altura de `360px`, reservando área mínima de `300px` para o gráfico e garantindo espaço livre dedicado para a exibição limpa e sem cortes da legenda.

---

## 7. Ponto Crítico 2 — Ajuste de Tipografia & Identidade Visual

### 7.1 Diretrizes de Tipografia Corporativa
Para afastar a aplicação de aspectos visuais genéricos, definiu-se a padronização tipográfica:
- **Família Principal:** `Inter` (Google Fonts), integrada com fallback nativo para `Segoe UI Semibold`.
- **Alinhamento Numérico:** Utilização de numeração tabular (`font-variant-numeric: tabular-nums`) nos cards de KPI e tabelas, garantindo que os dígitos numéricos permaneçam alinhados verticalmente para facilitada leitura financeira.

---

## 8. Ponto Crítico 3 — Governança de Código e Modelo GitFlow

### 8.1 Registro de Débito Técnico
Atualmente, todo o histórico de desenvolvimento encontra-se centralizado diretamente na branch `main`. A ausência de branches de isolamento representa um **risco técnico relevante**, podendo causar instabilidade na versão em uso durante novas alterações.

### 8.2 Estrutura GitFlow Proposta para Adoção

```
  main (Produção / Estável)
   │
   └── release/v1.0.0
        │
        └── develop (Integração)
             ├── feature/layout-legend-fix
             ├── feature/rpa-automation
             └── hotfix/data-parser-bug
```

- **`main`:** Armazena exclusivamente código homologado e pronto para operação.
- **`develop`:** Branch central onde todas as funcionalidades concluídas são integradas.
- **`feature/*`:** Branches temporárias para desenvolvimento de novas telas ou conectores (ex.: `feature/rpa-email-parser`).
- **`release/*`:** Branch de preparação de versão para testes finais de aceitação.
- **`hotfix/*`:** Branches emergenciais criadas a partir da `main` para correção imediata de bugs críticos.

---

## 9. Racionalização da Navegação Lateral (Sidebar)

A barra de navegação lateral foi otimizada para conter apenas os atalhos funcionais e essenciais aos 3 pilares logísticos (`Visão Geral`, `War Room Report`, `Air Freight`, `Cost x Product Amount`), removendo itens inativos que poluíam a interface visual sem agregar valor operacional.

---
*LG Electronics — DXI Logistics & Administrative Operations*
