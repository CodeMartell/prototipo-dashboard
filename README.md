# DataLens — Dashboard de Indicadores Logísticos (War Room)

Sistema integrado para captura de relatórios por e-mail, extração e persistência
de seis KPIs logísticos e análise em um dashboard React.

## Começar

O [roteiro de execução e testes](docs/guides/development.md) é a fonte
principal dos comandos: instalação, Docker, execução local com SQLite ou
PostgreSQL, carga de dados, testes, reset e diagnóstico.

A [documentação](docs/README.md) organiza arquitetura, desenvolvimento, testes e
histórico. Consulte os READMEs de [backend](server/README.md),
[frontend](dashboard/README.md), [bot legado](bot-extrator-email/README.md) e
[ferramentas auxiliares](scripts/README.md) para detalhes de cada área.

- [Arquitetura](#-visão-geral-e-arquitetura)
- [Indicadores](#-os-6-indicadores-kpis)
- [Estrutura](#estrutura-do-repositório)
- [Permissões e auditoria](#-divisão-de-privilégios-rbac-e-auditoria)
- [Licença](#licença)

## 🏛 Visão Geral e Arquitetura

O sistema é dividido em três camadas desacopladas que operam de forma orquestrada:

```
┌─────────────────────────┐       IMAP / SSL       ┌─────────────────────────┐
│     Caixa de E-mail     │ ─────────────────────> │   Robô RPA (Python)     │
│   (Gmail / Relatórios)  │                        │   `rpa_email/`          │
└─────────────────────────┘                        └────────────┬────────────┘
                                                                │
                                                  POST JSON     │ Autenticação JWT
                                                  ingestão HTTP │
                                                                v
┌─────────────────────────┐       HTTP Proxy       ┌─────────────────────────┐
│     Dashboard React     │ <───────────────────── │   API Backend FastAPI   │
│   (Vite / Recharts)     │     /api/* (port 5001) │   `server/`             │
│   `dashboard/`          │                        └────────────┬────────────┘
└─────────────────────────┘                                     │
                                                                │ SQLAlchemy / Alembic
                                                                v
                                                   ┌─────────────────────────┐
                                                   │  PostgreSQL / SQLite    │
                                                   │  conforme DATABASE_URL  │
                                                   └─────────────────────────┘
```

1. **Robô Extrator RPA (`rpa_email/`)**: Conecta à caixa de e-mails via protocolo IMAP, identifica mensagens pelo assunto e anexos (suporta relatórios normalizados `.xlsx` e planilhas originais brutas `.xlsb`), extrai os números, deduplica e envia um payload validado à fila de aprovação da API. Os KPIs são aplicados após aceite na página de perfil.
2. **Servidor Backend (`server/`)**: Desenvolvido em FastAPI e SQLAlchemy, gerencia a autenticação JWT, controle de acesso por papéis e permissões (RBAC), validação de payloads de ingestão, cálculo de desvios/anomalias e CRUD de planos de ação.
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

## Estrutura do repositório

```text
prototipo-dashboard/
├── dashboard/                 # React, Vite, traduções e testes JavaScript
├── server/                    # FastAPI, app/, alembic/, scripts/ e tests/
├── rpa_email/                 # Robô integrado à API, extratores e testes
├── bot-extrator-email/         # Bot autônomo legado do Épico 3 (IMAP/SMTP)
├── docs/
│   ├── architecture/          # Ingestão e diagrama C4
│   ├── guides/                # Desenvolvimento e operação local
│   ├── testing/               # Integração e aceite
│   └── history/               # Evidências e propostas datadas
├── scripts/
│   ├── development/           # Geração de planilhas e reset local
│   ├── homologation/          # Preparação e validadores locais controlados
│   ├── diagnostics/           # Inspeções manuais de mensagens e downloads
│   └── manual/                # Envio explícito de e-mail
├── tests/system/              # Integração HTTP + PostgreSQL isolada
├── scratch/                   # Explorações e planilhas históricas versionadas
├── history_and_data.txt        # Referência de dados históricos
├── .github/workflows/ci.yml    # Testes, lint, build e validação Docker
├── .env.example               # Modelo de configuração da raiz
├── docker-compose.yml         # db, api, frontend e perfil rpa
├── docker-compose.test.yml     # Integração descartável
├── docker-compose.homologacao.yml # Homologação local isolada
├── Dockerfile.api / Dockerfile.email-rpa / Dockerfile.test-api
├── docker-entrypoint-api.sh    # Migrations, seed RBAC e inicialização
└── start.bat                   # Inicialização Docker no Windows
```

`kpi_reports/` é gerado por `scripts/development/generate_kpi_reports.py` e ignorado pelo Git.
A carga histórica está em `server/scripts/seed_history_data.py`.

## 🛡️ Divisão de Privilégios (RBAC) e Auditoria

O DataLens adota um sistema robusto de controle de acesso baseado em papéis (RBAC) com permissões granulares e trilha de auditoria contínua *append-only*.

### 1. Papéis do Sistema (5 Roles)
- **ADMIN**: Acesso total ao sistema. Único perfil autorizado a atribuir o papel `ADMIN` a outros usuários.
- **GESTOR**: Edita e insere indicadores manualmente (via web ou desktop) e gerencia planos de ação (com checagem de autoria).
- **TI_SUPORTE**: Gerencia o ciclo de vida de usuários (CRUD e atribuição de papéis, exceto `ADMIN`) e consulta o histórico de atividade de qualquer usuário.
- **AUDITORIA**: Consulta irrestrita da trilha de auditoria (`audit_log`) de todos os usuários com filtro temporal.
- **VIEWER**: Visualização padrão do dashboard e leitura de planos de ação (acesso de consulta).

### 2. Matriz Oficial de Permissões (11 Códigos)

| Permissão | ADMIN | GESTOR | TI_SUPORTE | AUDITORIA | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `kpi:write_manual` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `kpi:delete` | ✅ | ✅ *(próprio)* | ❌ | ❌ | ❌ |
| `action_plans:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `action_plans:write` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `action_plans:delete` | ✅ | ✅ *(próprio)* | ❌ | ❌ | ❌ |
| `users:read` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `users:write` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `users:assign_role` | ✅ *(qualquer)* | ❌ | ✅ *(exceto ADMIN)* | ❌ | ❌ |
| `audit:read_all` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `audit:read_scoped` | ✅ | ❌ | ✅ *(requer actor_user_id)* | ❌ | ❌ |

### 3. Regras de Segurança Implementadas

#### A. Regra de Anti-Escalação de Privilégios
- **Enforcement no Service Layer (`UserService.update_user_role`)**: Se um usuário com o papel `TI_SUPORTE` tentar atribuir o papel `ADMIN` a qualquer usuário, o sistema rejeita imediatamente com código `HTTP 403 Forbidden`.
- **Enforcement na UI (`UserManagementPage`)**: O seletor de papéis omite dinamicamente a opção `ADMIN` caso o usuário autenticado não seja um Administrador.

#### B. Checagem de Autoria (Ownership Check)
- Para o papel `GESTOR`, as ações de exclusão (`kpi:delete` e `action_plans:delete`) verificam obrigatoriamente se `submitted_by == current_user.id`.
- Se o registro pertencer a outro gestor ou tiver sido ingerido automaticamente pelo robô (`rpa_email`), a exclusão é rejeitada com `HTTP 403 Forbidden`.
- Usuários `ADMIN` possuem bypass dessa regra e podem excluir qualquer registro.

#### C. Trilha de Auditoria Append-Only (`audit_log`)
- A tabela `audit_log` é estritamente **append-only** (somente `INSERT` e `SELECT` — o repositório não expõe métodos de `UPDATE` ou `DELETE`).
- Cada evento registra: `occurred_at`, `actor_user_id`, `actor_role_snapshot` (papel imutável no momento da ação), `action`, `target_type`, `target_id`, `metadata` (JSON) e `ip_address`.
- **Consulta Segura**: Exige obrigatoriamente o filtro de data inicial (`date_from`) ou data final (`date_to`).
- Para `audit:read_scoped` (usado pelo `TI_SUPORTE`), é obrigatório informar o parâmetro `actor_user_id`.

### 4. Como Inicializar e Aplicar o RBAC

Em um ambiente local de teste já configurado, aplique as migrations e o seed. O seed também cria as contas demonstrativas abaixo; o entrypoint Docker atual executa esse mesmo script.

```powershell
# 1. Aplicar a migration Alembic com as novas tabelas e colunas
cd server
alembic upgrade head

# 2. Executar o seed idempotente de roles, permissions e usuários de teste
python scripts/seed_rbac.py
cd ..
```

### 5. Usuários Padrão para Testes e Homologação (5 Papéis)

O script de seed (`server/scripts/seed_rbac.py`) e o script de reset (`scripts/development/reset_local_data.py`) provisionam automaticamente os seguintes acessos para validação de cada perfil:

| Papel | E-mail | Senha | Nome do Usuário | Capacidades Principais |
|---|---|---|---|---|
| **ADMIN** | `admin@lge.com` | `admin123` | Administrador Geral | Acesso irrestrito a todos os módulos, usuários e atribuição de ADMIN |
| **GESTOR** | `gestor@lge.com` | `gestor123` | Gestor de Indicadores | Edição manual de KPIs e gestão de planos de ação (com ownership check) |
| **TI_SUPORTE** | `suporte@lge.com` | `suporte123` | Suporte TI | Gestão de usuários (sem atribuir ADMIN) e consulta de atividade individual |
| **AUDITORIA** | `auditoria@lge.com` | `auditoria123` | Auditor de Processos | Leitura global irrestrita da trilha de auditoria (`audit_log`) |
| **VIEWER** | `viewer@lge.com` | `viewer123` | Visualizador Básico | Consulta do dashboard e leitura de planos de ação |

---


## Licença

Projeto desenvolvido para prototipação e gestão logística interna. O README
anterior indicava licença MIT, mas não há arquivo `LICENSE` versionado. Confirmar
com os responsáveis o texto e a titularidade antes de formalizar a distribuição.
