# Documentação de Arquitetura de Software — Modelo C4 (C4 Model)

**Projeto:** Ecossistema de Automação e Analytics Logístico (RPA + Dashboard App)  
**Cliente:** LG Electronics — Área de Logística e Administrativo (DXI)  
**Status:** Especificação de Arquitetura v1.0  
**Data:** 06 de Agosto de 2026  

---

## 1. Visão Geral da Arquitetura

O ecossistema de automação e inteligência logística da **LG Electronics (DXI)** é estruturado segundo os princípios da arquitetura moderna de dados e visualização web, dividindo-se em duas grande camadas operacionais:

1. **Camada de Automação & Extração (RPA):** Esteira automatizada em Python responsável por ler e-mails financeiros, realizar extração headless de relatórios do ERP (GERP/ARUM) e consolidar os arquivos na camada de staging.
2. **Camada de Analytics & Frontend (Dashboard App):** Aplicação interativa construída em **React 19**, **Vite 8** e **Recharts**, encarregada do cálculo das métricas DAX/YoY, detecção automatizada de anomalias e gestão de planos de ação.

---

## 2. Nível 1: Diagrama de Contexto de Sistema (System Context)

O diagrama de contexto detalha as fronteiras da plataforma de automação logística em relação aos atores operacionais e aos sistemas corporativos da LG.

```mermaid
graph TD
    classDef actor fill:#1e293b,stroke:#475569,stroke-width:2px,color:#f8fafc;
    classDef system fill:#0f172a,stroke:#3b82f6,stroke-width:3px,color:#f8fafc;
    classDef external fill:#1a1b2e,stroke:#64748b,stroke-width:1px,color:#cbd5e1;

    A1[Equipe de Gestão Logística]:::actor -->|Visualiza KPIs e Planos de Ação| SYS[Plataforma Integrada RPA + Dashboard App]:::system
    A2[Equipe Financeira]:::actor -->|Envia relatórios anexos via E-mail| EXT4[Servidor Exchange / E-mails]:::external
    A3[Engenharia de Dados]:::actor -->|Configura conectores e pipeline| SYS

    EXT1[GERP - ERP Proprietário LG]:::external -->|Dados Fiscais e Produção| SYS
    EXT2[ARUM System]:::external -->|Ordens de Transporte & Frete| SYS
    EXT3[Incident Cost System]:::external -->|Custos Não Planejados| SYS
    EXT4 -->|Planilhas e Fechamentos| SYS
```

### Elementos do Contexto
- **Plataforma Integrada (Escopo Principal):** Solução central de automação RPA e aplicação web para visualização analítica.
- **Sistemas Origem Externos:** GERP (ERP), ARUM (Fretes), Incident Cost System (Sinistros/Demurrage) e Exchange Server (E-mails).
- **Perfis de Usuários:** Solicitantes/Gestores Logísticos, Engenharia de Dados e Operações Financeiras.

---

## 3. Nível 2: Diagrama de Contêineres (Containers)

O nível de contêineres descreve as unidades de software executáveis que compõem a solução.

```mermaid
graph TD
    classDef container fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef db fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#f8fafc;

    C1[1. Robô Extrator RPA<br/><i>Python / Automation Scripts</i>]:::container
    C2[2. Staging Data Store<br/><i>SQL DB / Master Excel Dataset</i>]:::db
    C3[3. Transformation Engine<br/><i>Data Aggregator & YoY Calculator</i>]:::container
    C4[4. Dashboard Frontend App<br/><i>React 19 + Vite + Recharts</i>]:::container

    C1 -->|Extrai e Higieniza| C2
    C2 -->|Lê Dados Brutos| C3
    C3 -->|Estrutura JSON / API| C4
```

### Tabela de Especificação dos Contêineres

| Contêiner | Tecnologia | Função no Sistema |
|---|---|---|
| **1. Robô Extrator RPA** | Python (Pandas/IMAP) | Baixa anexos de e-mails, acessa ERP e normaliza planilhas de entrada. |
| **2. Staging Data Store** | SQL DB / Excel Master | Camada de persistência intermediária para históricos de produção e frete. |
| **3. Transformation Engine** | Python / JavaScript Engine | Aplica fórmulas de negócio (Logistic Cost %, Achievement, YoY, Anomalias). |
| **4. Dashboard Frontend App** | React 19 / Vite / Recharts | Interface gráfica interativa para navegação, filtros e acompanhamento. |

---

## 4. Nível 3: Diagrama de Componentes (Components)

Detalhamento interno dos componentes de software que formam a **Aplicação Dashboard Frontend (Contêiner 4)** e o **Robô Extrator RPA (Contêiner 1)**.

```mermaid
graph LR
    subgraph FrontendApp ["Contêiner 4: Dashboard Frontend App"]
        SBAR[Sidebar Component]
        HEAD[Header Component]
        CARD[KPICard Component]
        SEC[KPISection Component]
        CHART[ComparisonChart Component]
        TBL[DetailTable Component]
        ACT[ActionPlanPanel Component]
    end

    SEC --> CHART
    SEC --> TBL
    SEC --> ACT
```

### Componentes Principais do Frontend:
- **`KPICard`:** Card resumido do topo da página com exibição de valor atual, target, badge de variação YoY e sparkline.
- **`ComparisonChart`:** Gráfico composto (Barra Realizado + Linhas Histórica e Target) com container flex ajustado para zero corte de legendas.
- **`DetailTable`:** Tabela analítica com realce condicional para melhores/piores meses e detecção de anomalias ($>2\sigma$).
- **`ActionPlanPanel` & `EvidencePanel`:** Componentes de gestão de justificativas e simulação de upload de evidências operacionais.

---

## 5. Nível 4: Diagrama Dinâmico (Dynamic Flow)

O diagrama dinâmico ilustra a sequência de execução de um ciclo completo de atualização e visualização de dados.

1. **Gatilho de Extração:** O Robô RPA é acionado e varre a caixa de entrada do Exchange buscando o relatório semanal do financeiro.
2. **Higienização:** O robô converte colunas, valida tipos e calcula os somatórios de `Custo Logístico` e `Volume de Produção`.
3. **Carga em Staging:** Os dados higienizados são consolidados no repositório de staging.
4. **Processamento do Dashboard:** O motor da aplicação web lê a estrutura atualizada, calcula a variação YoY ($2026 \times 2025$) e gera as badges de status.
5. **Renderização Interativa:** O usuário acessa a aplicação web, navega pelos painéis (`War Room Report`, `Air Freight`, `Cost x Product Amount`) e registra observações no Plano de Ação.

---

## 6. Arquitetura de Governança de Código & Modelo GitFlow

### 6.1 Registro de Débito Técnico
Todo o projeto encontra-se atualmente publicado em uma única branch (`main`). Essa estrutura representa um débito técnico de governança, aumentando o risco de regressões não intencionais durante o desenvolvimento contínuo.

### 6.2 Modelo GitFlow Proposto

Para garantir integridade corporativa e deploys seguros, propõe-se a implementação do ciclo GitFlow:

- **`main`:** Código de produção testado e homologado.
- **`develop`:** Branch oficial para integração de recursos.
- **`feature/*`:** Branches isoladas por funcionalidade (ex.: `feature/sidepanel-scroll`, `feature/rpa-connector`).
- **`release/*`:** Pacotes candidatos a lançamento.
- **`hotfix/*`:** Correções emergenciais diretamente sobre `main`.

---

## 7. Requisitos Não-Funcionais e Ajustes de Design

### 7.1 Tipografia Corporativa (Inter)
- Adoção da fonte **`Inter`** com numeração tabular (`tabular-nums`) para evitar oscilações visuais nos números dos indicadores durante a navegação.

### 7.2 Correção de Layout nas Legendas
- Adequação dos componentes de gráfico para uso de container flexbox de `360px` de altura, garantindo que as legendas (`2026 Realizado`, `2025 Ano Anterior`, `Target`) permaneçam 100% visíveis em qualquer resolução.

---
*LG Electronics — DXI Logistics Analytics Team*
