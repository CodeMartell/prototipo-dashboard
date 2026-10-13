# DataLens — Backend FastAPI

A API segue Controller–Service–Repository e é responsável pela persistência dos
KPIs. O RPA envia `POST /api/ingestion/kpi-report` com JWT; não escreve no banco.
Os cinco papéis atuais, a matriz de permissões e as contas demonstrativas estão
no [README principal](../README.md#-divisão-de-privilégios-rbac-e-auditoria).

## Executar e testar

Siga o [roteiro principal](../docs/roteiro-testes-aplicacao.md) para dependências,
`.env` da raiz, migrations, seed, PostgreSQL/SQLite, carga histórica e testes.
O entrypoint Docker aplica migrations, executa `scripts/seed_rbac.py` e cria o
administrador de `ADMIN_*` quando configurado. O seed também provisiona contas
demonstrativas; revise esse comportamento antes de qualquer uso fora de testes.

Na execução local, API e Swagger usam `http://localhost:5001/docs`; no Compose
principal, a porta publicada é `http://localhost:9192/docs`.

## Contratos e persistência

| Rota | Uso / autorização |
| --- | --- |
| `GET /api/kpis/dashboard` | Séries dos indicadores, com autenticação |
| `PUT /api/kpis/{kpi_type}/{year}/{month}` | Meta e resultado; `kpi:write_manual` |
| `PUT /api/kpis/extra/logistics-vs-prod/{year}/{month}` | Custo x produção; `kpi:write_manual` |
| `DELETE /api/kpis/{kpi_type}/{year}/{month}` | Exclusão; `kpi:delete`, com autoria para GESTOR |
| `POST /api/ingestion/kpi-report` | Recepção do robô; ADMIN; novo lote retorna `pending` |
| `GET /api/profile/pending-ingestions` | Fila de aprovação; `kpi:write_manual` |
| `POST /api/profile/ingestions/{queue_id}/accept` | Aplica o lote aprovado; `kpi:write_manual` |
| `POST /api/profile/ingestions/{queue_id}/accept-partial` | Aplica itens selecionados; `kpi:write_manual` |
| `POST /api/profile/ingestions/{queue_id}/reject` | Rejeita o lote; `kpi:write_manual` |
| `POST /api/profile/ingestions/{queue_id}/rollback` | Reverte lote aceito; `kpi:write_manual` |

A recepção grava `email_ingest_queue`, com payload e diferenças para revisão;
a aprovação aplica os dados e registra o processamento. Um Message-ID que já
está na fila ou no histórico retorna `skipped`. Receber um e-mail com sucesso não
significa que seus números já estejam visíveis no dashboard.

`achievement` e `ratio` podem ser calculados pelo backend quando omitidos.
A direção dos indicadores, períodos válidos e cálculo estão em
[`app/core/kpi_meta.py`](app/core/kpi_meta.py). A carga
[`scripts/seed_history_data.py`](scripts/seed_history_data.py) faz upsert das
séries históricas de 2025/2026 e não roda no entrypoint, para evitar substituir
lançamentos manuais a cada inicialização. A referência histórica permanece em
[`history_and_data.txt`](../history_and_data.txt).

## Estrutura e manutenção

| Caminho | Responsabilidade |
| --- | --- |
| `main.py` | FastAPI, rotas, middleware de acesso, CORS e exceções |
| `app/controllers/` | Contratos HTTP, autenticação e autorização |
| `app/services/` | Regras de negócio, ingestão, aprovação e auditoria |
| `app/repositories/` | Acesso aos dados |
| `app/models/` e `app/schemas/` | SQLAlchemy e contratos Pydantic |
| `app/database/` | Engine, sessões e metadados |
| `app/core/` | Configuração, JWT, permissões, KPIs e logging |
| `alembic/` | Migrations versionadas |
| `scripts/` | Seeds RBAC, homologação, administrador e dados históricos |
| `tests/` | Testes unitários e de integração local |

Se uma alteração de modelo exigir migration, execute dentro de `server/`, com o
ambiente da API ativado e um banco de desenvolvimento configurado:

```powershell
python -m alembic revision --autogenerate -m "descricao da mudanca"
python -m alembic upgrade head
```

Revise o arquivo gerado antes de aplicar. Para apenas preparar um banco com o
schema existente, use `upgrade head`; não gere outra migration inicial.

As dependências estão em `requirements.txt` deste diretório: FastAPI, SQLAlchemy,
Alembic, Pydantic, psycopg, PyJWT e bcrypt, além das ferramentas de testes.
A integração com PostgreSQL descartável tem seus limites documentados em
[Ambiente de integração](../docs/ambiente-integracao.md).
