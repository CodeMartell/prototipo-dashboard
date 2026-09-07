# DataLens — Dashboard de KPIs Logísticos

Plataforma para consolidar e visualizar indicadores logísticos, com backend
próprio, banco de dados e um robô opcional que lê os relatórios por e-mail.

Tudo roda em contêiner: um único `docker compose up` sobe a aplicação inteira.

## Componentes

| Serviço | O que é | Porta no host (padrão) |
| --- | --- | --- |
| `frontend` | Dashboard React servido por Nginx | `8080` |
| `api` | Backend FastAPI (Controller–Service–Repository) | `5001` |
| `postgres` | Banco PostgreSQL 17 | `5432` |
| `rpa-bot` | Robô que lê relatórios por e-mail (opcional) | — |

O Nginx do frontend encaminha `/api` para o backend pela rede interna, então o
navegador conversa apenas com o frontend — sem CORS e sem URL de API fixada no
build.

---

## Pré-requisitos

Só **Docker** com o plugin Compose:

- Linux: Docker Engine + `docker-compose-plugin`
- Windows/Mac: Docker Desktop

Confira com:

```bash
docker --version
docker compose version
```

Não é necessário instalar Python nem Node no servidor: o build acontece dentro
das imagens.

---

## Configuração inicial (uma vez)

```bash
# 1. Clonar o repositório
git clone <URL_DO_REPOSITORIO>
cd prototipo-dashboard

# 2. Criar o arquivo de ambiente a partir do exemplo
cp .env.example .env        # Windows (PowerShell): copy .env.example .env
```

Edite o `.env`. Os campos que **precisam** ser ajustados antes de subir:

| Variável | O que fazer |
| --- | --- |
| `JWT_SECRET` | Trocar por um valor longo e aleatório. O Compose **recusa subir** se estiver vazio. |
| `ADMIN_EMAIL` | E-mail do primeiro usuário administrador. **Não use domínio `.local`** (veja a nota abaixo). |
| `ADMIN_PASSWORD` | Senha do primeiro administrador. |
| `POSTGRES_PORT` | Trocar para `5433` se a máquina já tiver um PostgreSQL usando a `5432`. |

Gerar um `JWT_SECRET`:

```bash
# Linux/Mac
openssl rand -hex 48
# Qualquer SO com Python
python -c "import secrets; print(secrets.token_hex(48))"
```

> **Atenção ao e-mail do admin:** não use domínios reservados como `.local`
> (ex.: `admin@empresa.local`). O usuário até é criado, mas o login falha com
> HTTP 422 porque o validador de e-mail rejeita TLDs reservados. Use um domínio
> real ou `example.com`.

---

## Forma 1 — back + front + banco

Sobe o dashboard, a API e o banco. É a forma padrão de uso.

```bash
docker compose up -d --build
```

O que acontece automaticamente no primeiro start:

1. O PostgreSQL cria um banco novo no volume `pg_data`.
2. A API aplica as migrations (`alembic upgrade head`).
3. É criado o perfil `ADMIN`.
4. É criado o primeiro usuário admin, com as credenciais do `.env`.

Carregue os dados históricos dos indicadores (uma vez):

```bash
docker compose exec api python scripts/seed_history_data.py
```

Acesse:

- Dashboard: <http://localhost:8080>
- API (documentação): <http://localhost:5001/docs>
- Banco (para outros serviços): `localhost:5432` (ou a `POSTGRES_PORT` do `.env`)

Faça login com o `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no `.env`.

---

## Forma 2 — back + front + banco + RPA

O robô de e-mail (`rpa-bot`) está em um profile separado, então só sobe quando
você pede. Ele lê os relatórios da caixa de e-mail configurada e envia os dados
para a API.

Antes de subir, preencha no `.env` a seção do robô:

| Variável | Descrição |
| --- | --- |
| `EMAIL_USER` | Conta que recebe os relatórios. |
| `EMAIL_PASSWORD` | **Senha de app** do Google (não a senha normal da conta). |
| `IMAP_HOST` / `IMAP_PORT` | Padrão `imap.gmail.com` / `993`. |
| `EMAIL_SUBJECT_FILTER` | Trecho exigido no assunto (padrão `Relatorio Logistico`). |
| `EMAIL_DATE_FROM` / `EMAIL_DATE_TO` | Janela de datas (`AAAA-MM-DD`). |
| `RPA_API_EMAIL` / `RPA_API_PASSWORD` | Conta da API que o robô usa para enviar os dados. Pode ser o mesmo admin. |

Suba tudo, incluindo o robô:

```bash
docker compose --profile rpa up -d --build
```

O robô roda uma vez por execução (não fica em loop). Para disparar uma nova
leitura da caixa depois:

```bash
docker compose --profile rpa run --rm rpa-bot
```

Acompanhar o log da última execução:

```bash
docker compose --profile rpa logs rpa-bot
```

> Detalhes do funcionamento do robô, formato dos anexos aceitos e diagnóstico
> estão em [`docs/automacao-rpa-email.md`](docs/automacao-rpa-email.md).

---

## Operação do dia a dia

**Ver o estado dos serviços**

```bash
docker compose ps
```

**Ver logs**

```bash
docker compose logs -f api        # um serviço
docker compose logs -f            # todos
```

**Parar sem perder dados**

```bash
docker compose down               # remove os contêineres, mantém os volumes
```

**Parar e apagar os dados** (recria o banco do zero no próximo `up`)

```bash
docker compose down -v            # CUIDADO: apaga o volume do banco
```

---

## Atualizar para uma versão nova

```bash
git pull
docker compose up -d --build
```

- As **migrations** rodam sozinhas no start (tabelas/colunas novas são aplicadas).
- Os **volumes são preservados**: banco e usuários continuam.
- O **seed dos KPIs não roda de novo** automaticamente. Rode manualmente só se a
  atualização trouxer dados novos (é idempotente — `upsert` por mês/ano):

  ```bash
  docker compose exec api python scripts/seed_history_data.py
  ```

Se o build não refletir o código novo (cache), force:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Usuários

O primeiro admin é criado no start a partir do `.env`. Para criar outros
usuários (todos com perfil ADMIN, o único hoje):

```bash
docker compose exec api python scripts/create_admin.py email@empresa.com senhaForte "Nome"
```

Observações:

- O script **não** altera a senha de um usuário que já existe — apenas informa
  que ele está lá. Trocar `ADMIN_PASSWORD` no `.env` depois não muda a senha de
  quem já foi criado.
- Não há tela de cadastro nem troca de senha pela interface.

---

## Dados e persistência

Os dados ficam em volumes gerenciados pelo Docker, nomeados por projeto:

| Volume | Conteúdo |
| --- | --- |
| `<projeto>_pg_data` | Banco de dados PostgreSQL |
| `<projeto>_email_attachments` | Anexos baixados pelo robô |
| `<projeto>_email_history` | Histórico de e-mails processados |

Volumes **não** vêm no repositório: em uma máquina nova eles nascem vazios e são
populados pelo start (banco) e pelo comando de seed (KPIs). Sobrevivem a
`docker compose down`; só são apagados com `down -v`.

Backup do banco:

```bash
docker compose exec postgres pg_dump -U dashboard dashboard > backup.sql
```

Restauração:

```bash
cat backup.sql | docker compose exec -T postgres psql -U dashboard -d dashboard
```

---

## Variáveis de ambiente (referência)

Todas estão documentadas no [`.env.example`](.env.example). Resumo dos grupos:

- **Banco**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
- **API**: `API_PORT`, `ENVIRONMENT`, `JWT_SECRET`, `JWT_ALGORITHM`,
  `JWT_EXPIRES_MINUTES`, `FRONTEND_ORIGIN`, `FRONTEND_ORIGIN_REGEX`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
- **Frontend**: `FRONTEND_PORT`
- **RPA**: `EMAIL_USER`, `EMAIL_PASSWORD`, `IMAP_HOST`, `IMAP_PORT`,
  `IMAP_MAILBOX`, `EMAIL_SUBJECT_FILTER`, `EMAIL_SENDER_FILTER`,
  `EMAIL_DATE_FROM`, `EMAIL_DATE_TO`, `RPA_API_EMAIL`, `RPA_API_PASSWORD`,
  `RPA_API_TIMEOUT`

Nunca versione o `.env` real — ele já está no `.gitignore`. O `.env.example` é o
modelo público, sem segredos.

---

## Solução de problemas

| Sintoma | Causa provável / solução |
| --- | --- |
| Compose recusa subir citando `JWT_SECRET` | Variável vazia no `.env`. Defina um valor. |
| Login retorna HTTP 422 | `ADMIN_EMAIL` com domínio reservado (`.local`). Use domínio real. |
| Porta 5432 em uso / erro ao subir o banco | Já há PostgreSQL na máquina. Ajuste `POSTGRES_PORT` (ex.: `5433`). |
| Dashboard abre mas não mostra dados | O seed não foi rodado: `docker compose exec api python scripts/seed_history_data.py`. |
| API não fica saudável | Veja `docker compose logs api`. A API espera o banco ficar pronto antes de subir. |
| Cards mostram `—` no mês atual | Normal se não houver dado para o período. Selecione um mês com dados no filtro. |

---

## Estrutura do repositório

```
.
├── docker-compose.yml        # orquestra os 4 serviços
├── Dockerfile.api            # imagem do backend
├── Dockerfile.email-rpa      # imagem do robô de e-mail
├── docker-entrypoint-api.sh  # migrations + seed de perfil/admin no start
├── .env.example              # modelo de configuração
├── server/                   # backend FastAPI
│   ├── app/                  # controllers, services, repositories, models
│   ├── alembic/              # migrations
│   └── scripts/              # seed_history_data, create_admin, seed_roles
├── dashboard/                # frontend React (Vite) + Nginx
├── rpa_email/                # robô de leitura de e-mail
├── Automacao-Planilha/       # extração dos relatórios brutos (.xlsb)
└── docs/                     # documentação complementar
```

---

## Documentação complementar

- [`docs/automacao-rpa-email.md`](docs/automacao-rpa-email.md) — o robô de e-mail em detalhe
- [`server/README.md`](server/README.md) — backend, migrations e rotas
