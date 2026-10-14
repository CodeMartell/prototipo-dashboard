# Relatório Técnico: Integração entre Desktop (DataLens Desktop) e Web (DataLens Dashboard)

> **Registro Histórico de Engenharia — Outubro de 2026**  
> **Branch de Trabalho:** `ajustes_integracao` (em ambos os repositórios: `prototipo-dashboard` e `datalens-desktop`)  
> **Contexto:** Item 7 — Integração entre Desktop e Web (Sincronização de Indicadores, Evidências e Planos de Ação)

---

## 1. Contexto e Objetivo

No escopo do projeto DataLens, foi identificado o seguinte requisito de integração:

- **Indicadores (KPIs):** Já eram atualizados pela versão Desktop e refletidos corretamente na versão Web, pois ambos utilizavam os endpoints `/api/kpis/` e `/api/dashboard/` do backend centralizado.
- **Evidências e Planos de Ação:** Diferentemente dos indicadores, as alterações feitas em evidências e planos de ação **não eram sincronizadas** entre as plataformas. O Desktop mantinha seus dados salvos localmente e a Web mantinha dados em cache de navegador, operando como silos isolados.
- **Objetivo da Tarefa:** Investigar e corrigir a integração de ponta a ponta, garantindo que planos de ação e evidências criados, editados ou excluídos em qualquer uma das plataformas sejam persistidos no backend centralizado e refletidos imediatamente em ambas as versões.

---

## 2. Diagnóstico das Causas Raízes

Durante a análise inicial do código-fonte em ambos os repositórios, foram mapeadas as seguintes causas raízes:

### 2.1. Planos de Ação (Action Plans)
1. **Frontend Web (`prototipo-dashboard/dashboard`):**
   - O componente `ActionPlanPanel.jsx` utilizava exclusivamente o utilitário `actionPlanStorage.js`, que persistia os registros no `localStorage` do navegador. Nenhuma requisição HTTP para a API REST era realizada.
2. **Aplicativo Desktop (`datalens-desktop`):**
   - O serviço `action_plan_service.py` persistia os planos de ação em um arquivo JSON local em disco (`storage/action_plans.json`). O `api_client.py` do desktop não possuía nenhum método implementado para consultar ou persistir planos de ação na API.
3. **Backend (`prototipo-dashboard/server`):**
   - Embora a tabela `action_plans` existisse no banco de dados, seu modelo (`ActionPlan`) e schemas (`ActionPlanIn`/`ActionPlanOut`) continham apenas campos genéricos (`title`, `description`, `status`, `kpi_type`). Faltavam colunas fundamentais utilizadas pelo negócio e pelo app Desktop: `year`, `period`, `owner`, `due_date` e `priority`.

### 2.2. Evidências (Evidences)
1. **Frontend Web:**
   - O componente `EvidencePanel.jsx` enviava arquivos para `/api/evidence/upload`, mas aceitava somente formatos de apresentação (`.ppt`, `.pptx`).
   - A consulta de evidências na API filtrava estritamente por `user_id == current_user["id"]`, impedindo o compartilhamento corporativo entre membros da equipe e entre as plataformas.
2. **Aplicativo Desktop:**
   - O serviço `evidence_service.py` apenas copiava os arquivos anexados para uma pasta local (`storage/evidences/`) e gravava metadados em `storage/evidences_meta.json`. Nenhuma chamada era feita à API para upload ou consulta remota.
3. **Incompatibilidade de Nomenclatura:**
   - O Frontend Web organizava KPIs com chaves em formato **camelCase** (ex: `logisticCost`, `totalCost`, `incidentialCost`), enquanto o Desktop e o Banco de Dados adotavam **snake_case** (ex: `logistic_cost`, `total_cost`, `incidental_cost`).
   - O seletor de ano no Web Dashboard adotava a convenção `Y26`, `Y25`, enquanto o Desktop persistia com o ano numérico ou literal, impedindo o match das consultas.

### 2.3. Rede e Infraestrutura Docker
- O `api_client` do Desktop estava configurado por padrão para conectar-se em `http://127.0.0.1:5001`.
- No entanto, o `docker-compose.yml` mapeava a porta da API apenas como `9192:5001`. Com isso, qualquer tentativa de conexão direta do Desktop na porta 5001 resultava em falha de conexão (`Connection Refused`).

---

## 3. Arquitetura da Solução Implementada

Para resolver os problemas de forma sustentável e aderente às diretrizes de arquitetura do projeto (FastAPI com Controller–Service–Repository no backend, React no frontend e Flet/Python no Desktop), foram implementadas as seguintes alterações:

```
┌────────────────────────────────────────────────────────┐
│                   DataLens Desktop                     │
│  (Flet / Python — Branch: ajustes_integracao)          │
│                                                        │
│  ActionPlanService ───┐                                │
│  EvidenceService   ───┴─► ApiClient (HTTP Client)      │
└────────────────────────────────────┬───────────────────┘
                                     │ HTTP (Porta 5001)
                                     ▼
┌────────────────────────────────────────────────────────┐
│                   Backend FastAPI                      │
│  (Docker Container — Porta 5001 / 9192)                │
│                                                        │
│  ┌────────────────────────┐  ┌───────────────────────┐ │
│  │ ActionPlanController   │  │ EvidenceController    │ │
│  └───────────┬────────────┘  └───────────┬───────────┘ │
│              ▼                           ▼             │
│  ┌────────────────────────┐  ┌───────────────────────┐ │
│  │ ActionPlanService      │  │ EvidenceService       │ │
│  └───────────┬────────────┘  └───────────┬───────────┘ │
│              ▼                           ▼             │
│  ┌────────────────────────┐  ┌───────────────────────┐ │
│  │ ActionPlanRepository   │  │ EvidenceRepository    │ │
│  │ (Normalização KPI/Ano) │  │ (Normalização KPI/Ano)│ │
│  └───────────┬────────────┘  └───────────┬───────────┘ │
│              ▼                           ▼             │
│             Banco de Dados (SQLite / PostgreSQL)       │
└────────────────────────────────────▲───────────────────┘
                                     │ HTTP (Porta 5001 / 9192)
                                     │
┌────────────────────────────────────┴───────────────────┐
│                   DataLens Web                         │
│  (React / Vite — Branch: ajustes_integracao)           │
│                                                        │
│  ActionPlanPanel ───► api.js                           │
│  EvidencePanel   ───► api.js                           │
│  KPISection (Normalização canônica de chaves)          │
└────────────────────────────────────────────────────────┘
```

---

## 4. Detalhamento das Alterações por Componente

### 4.1. Backend (`prototipo-dashboard/server`)

1. **Evolução do Modelo de Dados (`server/app/models/action_plan.py`):**
   - Adicionadas as colunas:
     - `year = Column(String(10), nullable=True, index=True)`
     - `period = Column(String(10), nullable=True, index=True)`
     - `owner = Column(String(100), nullable=True)`
     - `due_date = Column(String(20), nullable=True)`
     - `priority = Column(String(20), nullable=True, default="Média")`

2. **Migração Automática no Startup (`server/main.py`):**
   - Implementada rotina idempotente de migração de banco via SQL DDL (`ALTER TABLE action_plans ADD COLUMN ...`), permitindo que bancos existentes executados via Docker ou localmente recebam as novas colunas sem perda de dados.

3. **Schemas Pydantic (`server/app/schemas/action_plan_schema.py`):**
   - Atualizados `ActionPlanIn` e `ActionPlanOut` para suportar os novos campos (`year`, `period`, `owner`, `due_date`, `priority`), mantendo total retrocompatibilidade com validações existentes.

4. **Repositório com Busca Dinâmica e Normalização (`server/app/repositories/action_plan_repository.py`):**
   - Implementado método `list_by_filters` suportando `kpi_type`, `year`, `period` e `status`.
   - Adicionado mapeamento bidirecional de chaves de KPI:
     - `logisticCost` ↔ `logistic_cost`
     - `totalCost` ↔ `total_cost`
     - `incidentialCost` ↔ `incidental_cost`
   - Normalização bidirecional de ano: consultas por `Y26` buscam registros salvos como `Y26` ou `2026`.

5. **Controllers e Compartilhamento de Evidências (`server/app/controllers/`):**
   - `action_plan_controller.py`: Adicionados parâmetros de consulta `kpi_type`, `year`, `period`, `status` no endpoint `GET /api/action-plans`.
   - `evidence_controller.py`:
     - Habilitado suporte a arquivos `.pdf` além de `.ppt` e `.pptx`.
     - Removido o filtro restritivo de usuário individual na listagem de evidências por KPI, tornando as evidências de indicadores visíveis corporativamente para a equipe no Dashboard.
     - Adicionada normalização de chaves de KPI e anos nas rotas `/api/evidence/kpi/{kpi_type}/{year}`.

6. **Infraestrutura e Portas (`docker-compose.yml`, `start.bat`, `start.sh`):**
   - Mapeada a porta `5001:5001` no serviço `api` (ao lado de `9192:5001`), eliminando a necessidade de reconfiguração de portas no Desktop.
   - Atualizados os scripts de inicialização para reportar a disponibilidade da API Desktop em `http://localhost:5001`.

---

### 4.2. Frontend Web (`prototipo-dashboard/dashboard`)

1. **Sincronização em `ActionPlanPanel.jsx`:**
   - Integração com as funções de API: `fetchActionPlans`, `createActionPlan` e `deleteActionPlan`.
   - Implementado mecanismo de resiliência: se o backend estiver inacessível, o painel mantém fallback para o armazenamento local.
   - Atualização do indicador de status da interface: exibição de badge `✓ Sincronizado com o servidor` quando os dados são persistidos na API.
   - Suporte aos campos `owner`, `due_date` e `priority` na interface de cadastro e listagem.

2. **Melhorias em `EvidencePanel.jsx`:**
   - Permitido o upload de arquivos `.pdf`, `.ppt` e `.pptx`.
   - Implementado fallback duplo de busca por ano (`selectedYear` como `Y26` e conversão para `2026`).

3. **Padronização Canônica em `KPISection.jsx`:**
   - Criação do `canonicalKpiKey` memoizado, garantindo que componentes filhos sempre recebam e consultem a chave do indicador de forma padronizada.

4. **Internacionalização (`src/locales/`):**
   - Adicionada chave `saved_synced` nos dicionários `pt.json`, `en.json` e `ko.json`.

---

### 4.3. Aplicativo Desktop (`datalens-desktop`)

> Todas as alterações foram isoladas na branch dedicada **`ajustes_integracao`**, mantendo a branch principal `main` preservada.

1. **Cliente HTTP Centralizado (`desktop_app/services/api_client.py`):**
   - Implementados métodos completos para planos de ação:
     - `get_action_plans(kpi_type, year, period, status)`
     - `create_action_plan(data)`
     - `delete_action_plan(action_plan_id)`
   - Implementados métodos completos para evidências:
     - `get_evidences(kpi_type, year)`
     - `upload_evidence(file_path, kpi_type, year, original_filename)`
     - `download_evidence(evidence_id, destination_path)`
     - `delete_evidence(evidence_id)`

2. **Serviço Híbrido de Planos de Ação (`desktop_app/services/action_plan_service.py`):**
   - Estratégia Online-First: tenta gravar e sincronizar via API HTTP; em caso de falha de conexão, opera localmente no arquivo JSON e sincroniza assim que a conectividade for restabelecida.

3. **Serviço Híbrido de Evidências (`desktop_app/services/evidence_service.py`):**
   - Faz upload dos arquivos para a API do backend, preservando cópia local e permitindo listagem em tempo real com preservação do nome legível do arquivo original.

4. **Injeção de Dependências (`desktop_app/main.py`):**
   - Instanciação e injeção do `api_client` nos construtores de `ActionPlanService` e `EvidenceService` no startup da aplicação Flet.

---

## 5. Desafios Técnicos Enfrentados e Soluções Adotadas

| # | Desafio Encontrado | Sintoma / Erro | Causa Raiz | Solução Adotada |
|---|-------------------|----------------|------------|-----------------|
| **1** | **Conexão recusada na porta 5001** | `Failed to establish connection: Connection Refused (port 5001)` | O container Docker do backend expunha apenas a porta `9192:5001`. O app Desktop estava codificado para conectar-se na porta 5001. | Mapeada a porta `5001:5001` no `docker-compose.yml` e ajustados os scripts `start.bat`/`start.sh`. |
| **2** | **Falta de importação no Python Desktop** | `Falha ao subir evidência para API: name 'Path' is not defined` | O módulo `api_client.py` utilizava a classe `Path` para inspecionar arquivos sem tê-la importado de `pathlib`. | Adicionado `from pathlib import Path` no topo de `desktop_app/services/api_client.py`. |
| **3** | **Nome do arquivo descaracterizado no upload** | Arquivo salvo no servidor com hash/timestamp (ex: `1791949992_evidencia.pdf`) em vez do nome original. | O Desktop salvava o arquivo local com timestamp hash e enviava diretamente o caminho físico no `open(file_path, "rb")`. | Ajustado `upload_evidence` para aceitar `original_filename` e compor o formulário multipart com a tupla: `("file", (filename, f, mime))`. |
| **4** | **Divergência de identificadores (camelCase vs snake_case)** | Planos e evidências criados no Desktop apareciam salvos na API, mas o Dashboard Web permanecia vazio. | O frontend web consultava por `logisticCost`, enquanto o Desktop gravava `logistic_cost`. | Implementado dicionário bidirecional `KPI_MAP` no repositório do backend e normalização `canonicalKpiKey` no frontend React. |
| **5** | **Divergência de formato de ano (`Y26` vs `2026`)** | Evidências enviadas no Desktop ficavam sob `Y26`, mas o frontend filtrava por `2026`. | Inconsistência no tratamento do prefixo 'Y' entre o seletor visual e a query de API. | O backend passou a resolver anos de forma cruzada (`_normalize_years`): se recebe `Y26`, busca por `Y26` e `2026`; se recebe `2026`, busca por `2026` e `Y26`. |
| **6** | **Filtro estrito de usuário em Evidências** | Evidências enviadas por um usuário/desktop não eram listadas para outros logins na Web. | O controller aplicava `Evidence.user_id == current_user["id"]` na consulta geral de evidências por KPI. | Ajustado o escopo da listagem de evidências para o nível compartilhado do indicador/projeto, permitindo visão corporativa unificada. |
| **7** | **Evidências da Web não apareciam no Desktop** | Upload feito no Web Dashboard não refletia na listagem do Desktop (direção Web → Desktop). | O serviço `evidence_service.get_evidences()` no Desktop consultava apenas o cache JSON local em disco (`evidences_meta.json`) sem buscar os registros da API. | Implementada sincronização remota via `api_client.get_evidences()`, prevenção de duplicatas por ID/remote_id e download automático sob demanda ao abrir o arquivo no Desktop. |
| **8** | **Bloqueio de upload de arquivos > 1 MB no Web** | Arquivos PDF/PPT acima de 1 MB travavam ou retornavam erro 413, impossibilitando uploads de até 25 MB. | O Nginx nos containers (`dashboard/nginx.conf` e `nginx/nginx.conf`) operava com o valor padrão de `client_max_body_size 1m`. | Configurado `client_max_body_size 50M;` no Nginx, aumentado o limite do backend para 50 MB, adicionado suporte textual explícito a `.PDF` nos textos de interface (`pt`, `en`, `ko`) e botão de descarte para arquivos pendentes. |

---

## 6. Validação e Homologação

Para certificar a integridade das modificações, foram executados os seguintes procedimentos de teste:

1. **Testes Unitários do Frontend Web:**
   - Executado: `npm test` dentro do diretório `dashboard/`.
   - Resultado: **46 testes aprovados** (100% de sucesso), cobrindo renderização, formulários e integração dos painéis.
2. **Build de Produção do Frontend:**
   - Executado: `npm run build`.
   - Resultado: Compilação realizada com sucesso via Vite, sem erros de tipagem ou bundling.
3. **Testes de Integração da API e Desktop:**
   - Executados testes de contrato HTTP simulando `GET /api/action-plans`, `POST /api/action-plans`, `DELETE /api/action-plans/{id}`, além de upload e listagem de evidências.
   - Verificado retorno de status HTTP `200` e `201` com payloads normalizados.
4. **Validação Visual de Ponta a Ponta (E2E):**
   - Criação de planos de ação e anexação de evidências diretamente no aplicativo **DataLens Desktop**.
   - Atualização instantânea e visualização correspondente no **DataLens Web Dashboard**.
   - Homologação visual aprovada pelo usuário com a confirmação de que os dois ambientes encontram-se plenamente interligados.

---

## 7. Roteiro para Execução e Teste

Para subir o ambiente com a integração ativa:

```bash
# 1. No repositório prototipo-dashboard (branch: ajustes_integracao)
./start.bat   # ou ./start.sh no Linux/Mac
# Isso iniciará a API na porta 5001 e o Dashboard Web na porta 5173

# 2. No repositório datalens-desktop (branch: ajustes_integracao)
Voce pode simplemente clicar 2x no executavel run-desktop ou seguir o passo a passo:

python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m desktop_app.main
```

Ao cadastrar um Plano de Ação ou Evidência no Desktop, acesse o Web Dashboard em `http://localhost:5173`, selecione o KPI e Ano correspondentes e confirme a presença dos registros sincronizados.
