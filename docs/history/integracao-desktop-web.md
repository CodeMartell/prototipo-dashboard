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

### 5.1. Matriz Sintética de Desafios

| # | Desafio Encontrado | Sintoma / Erro | Causa Raiz | Solução Adotada |
|---|-------------------|----------------|------------|-----------------|
| **1** | **Conexão recusada na porta 5001** | `Failed to establish connection: Connection Refused (port 5001)` | O container Docker do backend expunha apenas a porta `9192:5001`. O app Desktop estava codificado para conectar-se na porta 5001. | Mapeada a porta `5001:5001` no `docker-compose.yml` e ajustados os scripts `start.bat`/`start.sh`. |
| **2** | **Falta de importação no Python Desktop** | `Falha ao subir evidência para API: name 'Path' is not defined` | O módulo `api_client.py` utilizava a classe `Path` para inspecionar arquivos sem tê-la importado de `pathlib`. | Adicionado `from pathlib import Path` no topo de `desktop_app/services/api_client.py`. |
| **3** | **Nome do arquivo descaracterizado no upload** | Arquivo salvo no servidor com hash/timestamp (ex: `1791949992_evidencia.pdf`) em vez do nome original. | O Desktop salvava o arquivo local com timestamp hash e enviava diretamente o caminho físico no `open(file_path, "rb")`. | Ajustado `upload_evidence` para aceitar `original_filename` e compor o formulário multipart com a tupla: `("file", (filename, f, mime))`. |
| **4** | **Divergência de identificadores (camelCase vs snake_case)** | Planos e evidências criados no Desktop apareciam salvos na API, mas o Dashboard Web permanecia vazio. | O frontend web consultava por `logisticCost`, enquanto o Desktop gravava `logistic_cost`. | Implementado dicionário bidirecional `KPI_MAP` no repositório do backend e normalização `canonicalKpiKey` no frontend React. |
| **5** | **Divergência de formato de ano (`Y26` vs `2026`)** | Evidências enviadas no Desktop ficavam sob `Y26`, mas o frontend filtrava por `2026`. | Inconsistência no tratamento do prefixo 'Y' entre o seletor visual e a query de API. | O backend passou a resolver anos de forma cruzada (`_normalize_years`): se recebe `Y26`, busca por `Y26` e `2026`; se recebe `2026`, busca por `2026` e `Y26`. |
| **6** | **Filtro estrito de usuário em Evidências** | Evidências enviadas por um usuário/desktop não eram listadas para outros logins na Web. | O controller aplicava `Evidence.user_id == current_user["id"]` na consulta geral de evidências por KPI. | Ajustado o escopo da listagem de evidências para o nível compartilhado do indicador/projeto, permitindo visão corporativa unificada. |
| **7** | **Evidências da Web não apareciam no Desktop** | Upload feito no Web Dashboard não refletia na listagem do Desktop (direção Web → Desktop). | O serviço `evidence_service.get_evidences()` no Desktop consultava apenas o cache JSON local em disco (`evidences_meta.json`) sem buscar os registros da API. | Implementada sincronização remota via `api_client.get_evidences()`, prevenção de duplicatas por ID/remote_id e download automático sob demanda ao abrir o arquivo no Desktop. |
| **8** | **Bloqueio de upload de arquivos > 1 MB no Web** | Arquivos PDF/PPT acima de 1 MB travavam com spinner infinito no botão e retornavam HTTP 413. | O Nginx nos containers operava com o valor padrão de `client_max_body_size 1m;`. | Configurado `client_max_body_size 50M;` no Nginx, aumentado o limite do backend para 50 MB, adicionado suporte textual a `.PDF` e botão de descarte de anexos pendentes. |
| **9** | **Exclusão de planos e evidências não sincronizada** | Itens excluídos no Web continuavam no Desktop, e vice-versa. | O Desktop mantinha cache local e apenas adicionava novos itens remotos sem reconciliar exclusões da API (`remote_ids`); além disso, a exclusão na API de evidências barrava perfis GESTOR/ANALISTA criadas por outro usuário. | Implementada reconciliação bidirecional de exclusões nos serviços do Desktop (`action_plan_service` e `evidence_service`) e permissão de exclusão para papéis gestores no controller de evidências do backend. |
| **10** | **Visualização de planos extensos e glitches visuais** | Textos compridos ficavam espremidos no card; no desktop o placeholder ficava sobreposto ao texto. | Falta de modal de expansão no Web e bug de shadow DOM multiline no Flet Desktop. | Criado modal de visualização expandida com zoom e backdrop blur no Web; removido o placeholder conflitante e normalizado o fuso horário no Desktop. |

---

### 5.2. Desafio 7 em Detalhes: Sincronização de Evidências Web → Desktop e Download Sob Demanda

- **Cenário e Sintoma:**  
  O upload realizado pelo aplicativo Desktop sincronizava perfeitamente com o servidor e era exibido no Web Dashboard. No entanto, o inverso não funcionava: quando o usuário realizava o upload de uma evidência (como um PDF de relatório ou apresentação PowerPoint) através do Web Dashboard, a lista de evidências do aplicativo Desktop permanecia inalterada, como se nenhum arquivo tivesse sido enviado.
- **Causa Raiz:**  
  O serviço `evidence_service.py` no aplicativo Desktop foi concebido originalmente como uma solução local e continuava consultando apenas o arquivo `storage/evidences_meta.json` gravado no disco da máquina. Ele nunca realizava chamadas à rota `GET /api/evidences` para recuperar registros cadastrados por outros usuários ou pela interface Web.
- **Solução Implementada:**  
  1. Modificado o método `get_evidences()` em `evidence_service.py` para consultar `self.api_client.get_evidences(kpi_key, year, period)`.
  2. Implementado mecanismo de mapeamento por `id` e `remote_id` para incorporar os metadados remotos no catálogo local sem criar duplicatas.
  3. Como o arquivo binário físico reside no banco de dados do servidor (armazenado em formato BLOB), foi implementado o download automático sob demanda: quando o usuário clica no botão *"Abrir arquivo"* no Desktop, se o arquivo ainda não existir localmente na pasta `storage/evidences/`, o método `open_file()` dispara transparentemente o download através da API (`GET /api/evidences/{id}/download`), salva a cópia local e a executa no aplicativo padrão do Windows (Adobe Reader, PowerPoint, etc.).

---

### 5.3. Desafio 8 em Detalhes: Limite de Upload no Proxy Nginx (1 MB vs 25 MB/50 MB) e Estado do Botão

- **Cenário e Sintoma:**  
  No painel de evidências do Web Dashboard (`EvidencePanel.jsx`), o card de upload indicava: `".PPT or .PPTX · 25 MB maximum per file"`. Ao selecionar ou arrastar arquivos perfeitamente válidos (como um PDF de 2 MB ou 15 MB) e clicar no botão *"Salvar na plataforma"*, o botão entrava em estado de envio (`isSaving = true`), ficava travado com o ícone de carregamento (spinner) e o upload nunca era concluído. Adicionalmente, a instrução textual do componente omitia o suporte a arquivos `.PDF`.
- **Investigação Técnica e Causa Raiz:**  
  1. No código da interface React (`EvidencePanel.jsx`), a constante de validação `MAX_SIZE` estava configurada para `25 * 1024 * 1024` (25 MB) e a lista de extensões permitidas incluía `pdf`.
  2. No backend FastAPI (`server/app/controllers/evidence_controller.py`), o endpoint `POST /api/evidences` também aceitava até 25 MB. Testes automatizados chamando a API diretamente na porta `5001` com arquivos de 5 MB obtinham `HTTP 201 Created` sem qualquer falha.
  3. No entanto, o usuário acessa o Dashboard Web através da porta `5173`, servida pelo container **Nginx** (`dashboard/nginx.conf`), o qual encaminha as chamadas `/api/` para o serviço de backend (assim como o proxy reverso HTTPS em `nginx/nginx.conf`).
  4. **Por padrão de fábrica, o Nginx adota `client_max_body_size 1m;` (exatamente 1 Megabyte)** sempre que essa diretiva não for explicitamente declarada.
  5. Ao receber um payload `multipart/form-data` cujo cabeçalho `Content-Length` excedia 1 MB, o Nginx cortava a conexão imediatamente antes mesmo de encaminhar a requisição ao FastAPI e retornava o código de erro **`HTTP 413 Request Entity Too Large`** em formato HTML.
  6. O navegador recebia o erro 413, o `fetch` falhava ao tentar interpretar o HTML como JSON e o botão de salvar permanecia desabilitado durante a tentativa ou exibia mensagens genéricas de falha.
- **Solução Implementada:**  
  1. **Ajuste de Infraestrutura Nginx (`dashboard/nginx.conf` e `nginx/nginx.conf`):**  
     Declarada a diretiva `client_max_body_size 50M;` tanto no bloco `server` quanto no bloco `location /api/`. O teto de 50 MB foi adotado para acomodar arquivos de 25 MB com folga para cabeçalhos multipart, além de equalizar a capacidade com o limite de 50 MB adotado no aplicativo Desktop.
  2. **Backend API (`server/app/controllers/evidence_controller.py`):**  
     Aumentado o `MAX_SIZE` no controller para `50 * 1024 * 1024` e atualizada a mensagem de validação de extensões para citar explicitamente: `"Envie somente apresentações PowerPoint (.ppt ou .pptx) ou documentos PDF (.pdf)."`.
  3. **Traduções e Usabilidade do Frontend (`EvidencePanel.jsx`, `locales/*.json`, `api.js`):**  
     - Textos em português, inglês e coreano atualizados para: *"Carregar Apresentação ou Documento"* e *".PDF, .PPT ou .PPTX · 25 MB máximo por arquivo"*.
     - Adicionado botão de descarte/cancelamento (`Trash2`) para cada arquivo na fila de pendentes, permitindo ao usuário remover um arquivo selecionado antes de enviar.
     - Implementado tratamento amigável para HTTP 413 em `api.js`, emitindo o aviso: *"O arquivo excede o limite máximo permitido pelo servidor."*.

---

### 5.4. Desafio 9 em Detalhes: Reconciliação Bidirecional de Exclusões (Delete Web ⇄ Desktop)

- **Cenário e Sintoma:**  
  Quando o usuário excluía um Plano de Ação ou uma Evidência no Web Dashboard, o registro deixava de aparecer na Web, mas continuava visível no Desktop. De modo análogo, ao excluir um item no Desktop, em determinadas situações ele continuava visível no Web Dashboard após atualização.
- **Investigação Técnica e Causa Raiz:**  
  1. **Fluxo Web → Desktop:**  
     - O Desktop mantém os dados em cache local (`action_plans.json` e `evidences_meta.json`).
     - Ao executar `get_action_plans()` ou `get_evidences()`, o Desktop consultava a API e percorria o retorno remoto **apenas para adicionar** novos itens inexistentes no cache local.
     - **Inexistência de reconciliação de exclusão:** Se um item fosse excluído na Web, ele deixava de vir na resposta da API. Como o Desktop apenas realizava inclusões aditivas, o registro antigo continuava com `deleted_at = None` no arquivo JSON local. Ao retornar os dados para a tela, o Desktop mesclava o arquivo local e reexibia o item que já havia sido apagado no servidor.
     - Se todos os itens de um período fossem excluídos na Web, a API retornava lista vazia `[]`. Como `if remote_items:` em Python avalia lista vazia como falso, o bloco de sincronização era totalmente ignorado e o Desktop exibia o histórico local defasado.
  2. **Fluxo Desktop → Web:**  
     - No backend (`server/app/controllers/evidence_controller.py`), o endpoint `DELETE /api/evidences/{id}` continha uma cláusula `if current_user.get("role") != "ADMIN": query = query.filter(Evidence.user_id == current_user["id"])`.
     - Como as evidências enviadas pelo Desktop eram gravadas sob o ID do usuário de serviço (`bot.local@example.com`), se um usuário com perfil `GESTOR` ou `ANALISTA` na Web tentasse excluir o arquivo, o backend devolvia `HTTP 404/403` e não excluía o registro do banco de dados.
     - No Desktop, as funções de deleção procuravam o item a ser excluído somente sob uma chave estrita (`f"{kpi_key}_{year}"`). Se houvesse qualquer discrepância de formatação na chave (ex: `Y26` vs `2026`), o item não era localizado localmente e a requisição HTTP `DELETE` para a API não era disparada.
- **Solução Implementada:**  
  1. **Algoritmo de Reconciliação no Desktop (`action_plan_service.py` e `evidence_service.py`):**  
     - Alterada a checagem para `if remote_list is not None:` (garantindo que listas vazias `[]` acionem a limpeza de itens excluídos).
     - Extraído o conjunto de IDs ativos da API: `remote_ids = {item["id"] for item in remote_items}`.
     - **Reconciliação ativa:** Todo item local que possui `remote_id` ou identificador de API, mas que **não consta mais** em `remote_ids`, é imediatamente marcado com `deleted_at = datetime.now().isoformat()` localmente.
  2. **Deleção Multi-chave no Desktop:**  
     - Em `delete_action_plan()` e `delete_evidence()`, a busca pelo item local agora examina todas as coleções por `id == target_id` ou `remote_id == target_id`, grava a marcação de lixeira local e executa a chamada `DELETE` na API com o `remote_id` correto.
  3. **Permissões no Backend (`evidence_controller.py`):**  
     - Atualizada a permissão de exclusão de evidências para autorizar papéis de gestão (`ADMIN`, `GESTOR`, `ANALISTA`), permitindo que a equipe corporativa remova evidências do indicador sem sofrer bloqueio caso o upload tenha sido realizado pela integração Desktop.

---

### 5.5. Visual: Card Zoom-in Modal Overlay (Web) e Correção de Textos no Desktop

- **Cenário e Requisito do Usuário:**  
  - No Web Dashboard, cards com planos de ação muito extensos ficavam espremidos na grade. Uma primeira tentativa de expandir os cards diretamente no grid esticava o painel e criava barras de rolagem internas verticais indesejadas. O usuário solicitou um efeito de card expandido elegante, similar a um alerta modal de leitura que cresce na tela e se fecha ao clicar fora ou no botão fechar.
  - No aplicativo Desktop, foram observados dois problemas: (a) texto de ajuda/placeholder desenhado de forma duplicada e sobreposta em cima do texto digitado pelo usuário (*glitch* gráfico do Flet/Flutter Web shadow DOM); e (b) divergência de horário ao salvar planos de ação no Desktop, que gravava em UTC e causava diferença de horas em relação ao relógio local.
- **Solução Implementada:**  
  1. **Web Dashboard (`ActionPlanPanel.jsx` e `index.css`):**  
     - Cards na grade mantidos compactos com limite de 4 linhas e reticências (`-webkit-line-clamp: 4`), com micro-animação de hover (`translateY(-2px)` e brilho de borda).
     - Ao clicar no card, abre-se uma janela modal centralizada (`.action-plan-modal-overlay` e `.action-plan-modal-card`) com transição suave de escala (`0.92 -> 1.0`), desfoque de fundo (`backdrop-filter: blur(6px)`), texto integral sem compressão, botão de fechar (`X`), fechamento por clique fora da área do card e suporte ao atalho de teclado `Escape`.
  2. **Aplicativo Desktop (`action_plan_view.py` e `action_plan_service.py`):**  
     - Removido o parâmetro dinâmico `hint_text` do campo de texto multiline, solucionando definitivamente a sobreposição visual de texto no Flet.
     - Implementada a conversão explícita de timestamps UTC para o fuso horário local do computador (`dt.astimezone()`), garantindo sincronia exata de horário entre o computador do usuário e a plataforma Web.

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
