# DataLens — Dashboard de Indicadores Logísticos (War Room)

Sistema integrado de ponta a ponta para consolidação, monitoramento e análise de 6 KPIs logísticos estratégicos. A plataforma automatiza a captura de relatórios via robô de e-mail (RPA), normaliza e persiste métricas em banco de dados relacional (PostgreSQL / SQLite), e fornece uma interface analítica moderna em React para suporte à tomada de decisão.

---

## 📑 Sumário

- [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
- [Os 6 Indicadores (KPIs)](#-os-6-indicadores-kpis)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Configuração de Variáveis de Ambiente (`.env`)](#-configuração-de-variáveis-de-ambiente-env)
- [Limpeza Total de Dados (Reset para Estado Zero)](#-limpeza-total-de-dados-reset-para-estado-zero)
- [Executando os Testes Automatizados](#-executando-os-testes-automatizados)
- [Como Testar a Aplicação Ponta a Ponta](#-como-testar-a-aplicação-ponta-a-ponta)
  - [Método 1: Execução Direta / Local (Sem Docker — Recomendado)](#método-1-execução-direta--local-sem-docker--recomendado)
  - [Método 2: Execução com Docker Compose](#método-2-execução-com-docker-compose)
- [Roteiro de Validação Manual (Checklist do Testador)](#-roteiro-de-validação-manual-checklist-do-testador)
- [Testando a Ingestão do Robô RPA](#-testando-a-ingestão-do-robô-rpa)
- [Resolução de Problemas Comuns (Troubleshooting)](#-resolução-de-problemas-comuns-troubleshooting)

---

## 🏛 Visão Geral e Arquitetura

O sistema é dividido em três camadas desacopladas que operam de forma orquestrada:

```
┌─────────────────────────┐       IMAP / SSL       ┌─────────────────────────┐
│     Caixa de E-mail     │ ─────────────────────> │   Robô RPA (Python)     │
│   (Gmail / Relatórios)  │                        │   `rpa_email/`          │
└─────────────────────────┘                        └────────────┬────────────┘
                                                                │
                                                  POST JSON     │ Autenticação JWT
                                                  /kpi-report   │
                                                                v
┌─────────────────────────┐       HTTP Proxy       ┌─────────────────────────┐
│     Dashboard React     │ <───────────────────── │   API Backend FastAPI   │
│   (Vite / Recharts)     │     /api/* (port 5001) │   `server/`             │
│   `dashboard/`          │                        └────────────┬────────────┘
└─────────────────────────┘                                     │
                                                                │ SQLAlchemy / Alembic
                                                                v
                                                   ┌─────────────────────────┐
                                                   │  PostgreSQL 17 / SQLite │
                                                   │  `dashboard.db`         │
                                                   └─────────────────────────┘
```

1. **Robô Extrator RPA (`rpa_email/`)**: Conecta à caixa de e-mails via protocolo IMAP, identifica mensagens pelo assunto e anexos (suporta relatórios normalizados `.xlsx` e planilhas originais brutas `.xlsb`), extrai os números, deduplica para não processar duas vezes e transmite um payload validado para a API.
2. **Servidor Backend (`server/`)**: Desenvolvido em FastAPI e SQLAlchemy, gerencia a autenticação JWT, controle de perfis de usuário (ADMIN e VIEWER), validação de payloads de ingestão, cálculo de desvios/anomalias e CRUD de planos de ação.
3. **Interface do Usuário (`dashboard/`)**: Single Page Application (SPA) desenvolvida em React 19 e Vite, com gráficos Recharts, filtros temporais dinâmicos, controle de acessibilidade e design responsivo.

---

## 📊 Os 6 Indicadores (KPIs)

| Indicador | Chave Técnica | Unidade | Critério de Sucesso | Descrição |
|---|---|---|---|---|
| **War Room Report** | `logistic_cost` | `%` | **Menor é melhor** | Custo logístico percentual sobre o faturamento |
| **Air Freight** | `air_freight` | `%` | **Menor é melhor** | Custo de frete aéreo percentual |
| **Resin Consolidation** | `incidental_cost` | `USD` | **Maior é melhor** | Saving obtido com consolidação de resina |
| **Task Cost Reduction** | `total_cost` | `USD` | **Maior é melhor** | Redução de custos em operações internas |
| **Demurrage Cost** | `demurrage` | `Qtd` | **Menor é melhor** | Quantidade de contêineres com sobrestadia (meta: 0) |
| **Logistics Cost x Product Amount** | `logistics_vs_prod` | `Ratio` | **Menor é melhor** | Relação entre custo logístico e volume produzido |

---

## 📁 Estrutura do Projeto

```
prototipo-dashboard/
├── dashboard/                 # Frontend React 19 + Vite
│   ├── src/
│   │   ├── components/        # Componentes visuais (KPICard, Charts, Filtros, etc.)
│   │   ├── pages/             # Telas principais (DashboardPage, LoginPage)
│   │   └── services/          # Cliente HTTP da API (api.js) e regras de negócio
│   └── package.json           # Scripts e dependências do frontend
├── server/                    # Backend FastAPI
│   ├── alembic/               # Migrations do banco de dados relacional
│   ├── app/
│   │   ├── controllers/       # Rotas REST (/api/auth, /api/dashboard, /api/ingestion)
│   │   ├── models/            # Modelos de dados SQLAlchemy (KPIs, Usuários, Perfis)
│   │   ├── repositories/      # Camada de acesso ao banco de dados
│   │   └── services/          # Regras de consolidação e ingestão
│   ├── scripts/               # Scripts de setup (create_admin.py, seed_history_data.py)
│   └── requirements.txt       # Dependências Python do backend
├── rpa_email/                 # Robô de Automação de E-mails
│   ├── config/                # Leitura de credenciais e filtros IMAP
│   ├── extractors/            # Extratores de planilhas (.xlsx e .xlsb brutos)
│   ├── resources/             # Histórico local de ingestão e anexos temporários
│   └── email_service.py       # Fluxo de varredura, deduplicação e envio
├── kpi_reports/               # Planilhas de teste sintéticas prontas para uso
├── scripts/
│   ├── reset_local_data.py    # Script de limpeza total para testar do zero
│   └── seed_history_data.py   # Carga com dados históricos de demonstração
├── docker-compose.yml         # Orquestração completa em contêineres
├── Dockerfile.api             # Imagem Docker do backend
├── Dockerfile.email-rpa       # Imagem Docker do robô RPA
├── .env.example               # Modelo documentado de variáveis de ambiente
└── README.md                  # Este guia
```

---

## ⚙️ Pré-requisitos

Para executar a aplicação no seu computador, certifique-se de possuir instalado:

- **Python 3.11+** ou **3.12+** (verifique com `python --version`)
- **Node.js 20+** e **npm** (verifique com `node --version` e `npm --version`)
- **Docker Desktop** (opcional, necessário apenas se optar por testar via Docker)
- **Git**

---

## 🔐 Configuração de Variáveis de Ambiente (`.env`)

Na raiz do projeto, copie o arquivo de exemplo para criar o seu `.env`:

```powershell
Copy-Item .env.example .env
```

Abra o arquivo `.env` e confirme os valores para teste local:

```dotenv
# Autenticação e API
API_PORT=5001
JWT_SECRET=supersecret-dev-local-jwt-token-key-32chars
ADMIN_EMAIL=admin@lge.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin

# Ingestão do Robô RPA para a API
RPA_API_URL=http://127.0.0.1:5001
RPA_API_EMAIL=admin@lge.com
RPA_API_PASSWORD=admin123
RPA_API_TIMEOUT=30

# Banco de Dados (SQLite para execução local rápida)
DATABASE_URL=sqlite:///./dashboard.db

# Configuração de E-mail (necessário apenas se for testar varredura real do Gmail)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo-google
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_MAILBOX=INBOX
EMAIL_SUBJECT_FILTER="Relatorio Logistico, Incidental Cost, Freight Air, War Room"
EMAIL_DATE_FROM=2026-01-01
EMAIL_DATE_TO=2026-12-31
```

> **Nota sobre o Gmail**: Caso utilize o robô com o Gmail, use uma **Senha de Aplicativo** gerada em sua Conta Google (Segurança -> Verificação em 2 etapas -> Senhas de app). Nunca utilize a senha comum da sua conta.

---

## 🧹 Limpeza Total de Dados (Reset para Estado Zero)

Quando quiser testar a aplicação **completamente do zero** (sem dados antigos, sem histórico de e-mails e com as tabelas de KPIs 100% vazias), execute o script de reset automatizado:

```powershell
python scripts/reset_local_data.py
```

Esse script realiza de forma segura:
1. Elimina o banco SQLite local (`dashboard.db`);
2. Limpa todos os anexos baixados em `rpa_email/resources/attachments`;
3. Apaga a base de deduplicação do robô (`api_email_history.db`);
4. Executa as migrations do **Alembic** recriando o schema vazio;
5. Cria o perfil obrigatório `ADMIN`;
6. Registra o usuário administrador limpo para login:
   - **E-mail:** `admin@lge.com`
   - **Senha:** `admin123`

---

## 🧪 Executando os Testes Automatizados

Antes de subir a aplicação, você pode validar a integridade de todas as camadas executando as suítes de testes:

### 1. Testes do Robô RPA (56 testes)
```powershell
python -m pytest rpa_email/tests -q
```
*Resultado esperado:* `56 passed`.

### 2. Testes do Backend FastAPI (53 testes)
```powershell
python -m pytest server/tests -q
```
*Resultado esperado:* `53 passed`.

### 3. Testes e Build do Frontend React (26 testes)
```powershell
cd dashboard
npm test
npm run build
cd ..
```
*Resultado esperado:* `26 pass, 0 fail` e pasta `dashboard/dist` gerada com sucesso.

---

## 🚀 Como Testar a Aplicação Ponta a Ponta

Você pode testar a aplicação de duas maneiras:
- **Método 1 (Recomendado):** Execução Direta / Local (muito mais rápida, utiliza SQLite e não depende do Docker).
- **Método 2:** Execução com Docker Compose (orquestra contêineres com PostgreSQL e Nginx).

---

### Método 1: Execução Direta / Local (Sem Docker — Recomendado)

#### Passo 1: Limpar os dados para começar do zero
No PowerShell, na raiz do projeto:
```powershell
python scripts/reset_local_data.py
```

#### Passo 2: Iniciar o Servidor Backend (FastAPI)
Abra um terminal PowerShell na pasta `server`:
```powershell
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```
- A API estará disponível em: `http://localhost:5001`
- Documentação interativa (Swagger): `http://localhost:5001/docs`
- Checagem de saúde: `http://localhost:5001/api/health` (deve retornar `{"status":"ok",...}`)

#### Passo 3: Iniciar o Frontend (React + Vite)
Abra **outro terminal PowerShell** na pasta `dashboard`:
```powershell
cd dashboard
npm run dev
```
- O frontend abrirá em: `http://localhost:5173`

#### Passo 4: Fazer Login na Aplicação
1. Acesse `http://localhost:5173` no seu navegador.
2. Na tela de Login, insira as credenciais geradas no reset:
   - **E-mail:** `admin@lge.com`
   - **Senha:** `admin123`
3. Clique em **Entrar**.
4. **Validação do estado zero:** Como o banco está limpo, você verá a interface carregada com o selo verde **API** no rodapé e os cards exibirão **"Sem dados"** para o período selecionado.

#### Passo 5: Alimentar Dados para Teste
Você tem 3 formas de alimentar a aplicação:

- **Opção A — Carga Rápida de Demonstração (Recomendado para explorar):**
  Para carregar todo o histórico de dados reais dos 6 KPIs (2025 e 2026), execute na raiz do projeto:
  ```powershell
  python server/scripts/seed_history_data.py
  ```
  Volte ao navegador e recarregue a página (`F5`). Todos os gráficos e cards estarão preenchidos!

- **Opção B — Ingestão via Robô de E-mail:**
  Envie um e-mail de teste com relatórios em anexo e execute o robô (veja detalhes na seção [Testando a Ingestão do Robô RPA](#-testando-a-ingestão-do-robô-rpa)).

- **Opção C — Cadastro Manual na Interface:**
  Como usuário `ADMIN`, clique no botão de edição/inserção de período no topo do dashboard para salvar metas e resultados manualmente.

---

### Método 2: Execução com Docker Compose

Se você possui o Docker Desktop instalado e em execução:

#### Passo 1: Limpar volumes e contêineres anteriores
```powershell
docker compose down -v
```

#### Passo 2: Subir os serviços
```powershell
docker compose up --build -d postgres api frontend
```

#### Passo 3: Conferir o status
```powershell
docker compose ps
```
Aguarde até que os serviços `datalens-postgres` e `datalens-api` estejam com status `healthy`.

#### Passo 4: Acessar a aplicação
- Acesse `http://localhost:5173` ou `http://localhost:80`.
- Login: `admin@lge.com` / `admin123` (ou as credenciais informadas no `.env`).

#### Passo 5: Popular dados históricos no Docker (opcional)
```powershell
docker compose exec api python scripts/seed_history_data.py
```

#### Passo 6: Rodar o robô RPA no Docker
```powershell
docker compose run --rm rpa-bot
```

#### Passo 7: Encerrar o ambiente Docker
```powershell
docker compose down
```
*(Para apagar completamente os dados do volume PostgreSQL no Docker, use `docker compose down -v`)*.

---

## 📋 Roteiro de Validação Manual (Checklist do Testador)

Após iniciar a aplicação e carregar dados, verifique os seguintes fluxos no navegador:

1. **Selo de Conexão com a API:**
   - No rodapé inferior da tela, verifique se o indicador exibe `Conectado à API`. Ele nunca deve exibir `MOCK`.
2. **Seleção de Ano:**
   - No seletor de ano no cabeçalho, alterne entre `2026` e `2025`.
   - Observe a atualização dos cards e dos gráficos de comparação ano a ano.
3. **Filtros de Período:**
   - Alterne entre os botões **Mensal**, **Trimestral**, **Semestral** e **Anual**.
   - No modo mensal, selecione meses específicos (ex: Jan, Fev, Mar) e verifique os cálculos de variação e atingimento.
4. **Regra de Cores e Direção dos Indicadores:**
   - **Menor é melhor** (*War Room Report*, *Air Freight*, *Demurrage*, *Logistics vs Prod*): quando o resultado for menor ou igual à meta, deve destacar positivamente (verde); desvios acima da meta destacam em vermelho.
   - **Maior é melhor** (*Resin Consolidation*, *Task Cost Reduction*): quando o resultado supera a meta, destaca positivamente.
5. **Acessibilidade:**
   - No cabeçalho, clique nos controles de tamanho de fonte (`A-` / `A+`) para verificar o redimensionamento dinâmico da interface.
6. **Planos de Ação:**
   - Role até a seção de Planos de Ação.
   - Adicione um novo plano com título, responsável, prazo e descrição.
   - Confirme se o plano persiste na listagem e teste a exclusão.
7. **Logout e Segurança:**
   - Clique em **Sair** no canto superior direito.
   - Verifique o redirecionamento imediato para `/login`.
   - Tente acessar a URL interna sem autenticação para confirmar o bloqueio de rota.

---

## 🤖 Testando a Ingestão do Robô RPA

O robô automatiza o fluxo de captura e envio de planilhas para a API.

### Formatos de Planilha Suportados

O robô aceita duas modalidades de arquivos:

1. **Planilhas Sintéticas / Normalizadas (`.xlsx`):**
   Disponíveis na pasta `kpi_reports/` do projeto:
   - `relatorio_logistic_cost.xlsx` (War Room Report)
   - `relatorio_air_freight.xlsx` (Air Freight)
   - `relatorio_incidental_cost.xlsx` (Resin Consolidation)
   - `relatorio_total_cost.xlsx` (Task Cost Reduction)
   - `relatorio_demurrage.xlsx` (Demurrage Cost)
   - `relatorio_logistics_vs_prod.xlsx` (Logistics Cost x Product Amount)

2. **Relatórios Originais Brutos (`.xlsb` e `.xlsx`):**
   Arquivos corporativos cujos nomes contenham:
   - `War Room` (`.xlsb` ou `.xlsx`)
   - `Freight Air` (`.xlsb` ou `.xlsx`)
   - `Incidental Cost_Total` (`.xlsb` ou `.xlsx`)
   - `3-indicadores` (`.xlsx`)

### Procedimento de Teste com o Gmail

1. No `.env`, configure `EMAIL_USER` e `EMAIL_PASSWORD` com suas credenciais do Gmail.
2. Certifique-se de que `EMAIL_SUBJECT_FILTER` inclua o assunto que você utilizará (ex: `Relatorio Logistico`).
3. Envie um e-mail para a conta configurada com:
   - **Assunto:** `Relatorio Logistico`
   - **Anexo:** Uma ou mais planilhas de teste (ex: `kpi_reports/relatorio_logistic_cost.xlsx`).
4. Com a API ativa (`http://localhost:5001`), execute o robô no terminal:
   ```powershell
   python -m rpa_email
   ```
5. **Resultado esperado no log:**
   ```text
   Execucao concluida | encontrados=1 processados=1 duplicados=0 fora_do_padrao=0 erros=0
   ```
6. Atualize o dashboard (`http://localhost:5173`) e confira os novos dados refletidos na tela.
7. **Teste de deduplicação:** Execute novamente `python -m rpa_email` sem enviar novo e-mail.
   - O log deve indicar `duplicados=1` e `processados=0`, garantindo que o mesmo relatório não seja gravado em duplicidade.

---

## 🔧 Resolução de Problemas Comuns (Troubleshooting)

### 1. Porta 5001 ou 5173 já em uso
Caso o terminal informe `address already in use`:
- No Windows/PowerShell, localize e encerre o processo:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process -Force
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
  ```

### 2. Erro de autenticação IMAP no Gmail (`AUTHENTICATIONFAILED`)
- O Gmail exige autenticação de 2 fatores ativada e o uso exclusivo de **Senha de Aplicativo** (16 caracteres). Não use a senha pessoal da sua conta.
- Certifique-se de que `IMAP_HOST=imap.gmail.com` e `IMAP_PORT=993`.

### 3. Docker: Falha ao conectar ao daemon (`dockerDesktopLinuxEngine`)
- Se o Docker Desktop não estiver aberto, utilize o **Método 1 (Execução Direta / Local)** descrito acima, que roda nativamente no Windows com SQLite e não requer Docker.

### 4. O dashboard exibe "Não foi possível conectar à API"
- Verifique se o servidor backend está rodando no terminal com `uvicorn`.
- Teste abrindo `http://localhost:5001/api/health` no navegador para confirmar que a API está respondendo com `status: ok`.

---

## 📄 Licença

Projeto desenvolvido para fins de prototipação e gestão logística interna. Distribuído sob a licença MIT.
